import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  X,
  Minus,
  Send,
  ChevronRight,
  RefreshCw,
  MessageSquare,
  Loader2,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCopilotTasks } from '../../hooks';
import { copilotService } from '../../services/copilotService';
import type { CopilotMessage } from '../../types';
import { DailyBriefingModal } from './DailyBriefingModal';
import { TaskCard } from './TaskCard';
import { CopilotMascot } from './CopilotMascot';
import { FormattedMessageText } from '../../utils/messageFormatter';

const GUARDRAIL_LABEL: Record<string, string> = {
  refuse_scope: 'Outside the EOC copilot scope',
  refuse_injection: 'Instruction override blocked',
  refuse_action: 'The copilot cannot carry out actions — use the relevant screen',
  refuse_length: 'Message too long',
};

/** "fallback:google/gemma-4-31b-it:free" -> "gemma-4-31b-it" */
const modelLabel = (m?: string | null) => (m ? m.replace(/^(gemini|fallback):/, '').replace(/:free$/, '').split('/').pop() : null);

const timeNow = () => new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });

/** Starter questions shown before the first message. */
const STARTERS = [
  'Which incidents still need a team?',
  'Summarise the critical incidents',
  'Which supplies are running low?',
];

export const EocCopilotChatbot: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Cached Copilot prioritized tasks (instant on repeat visits / fast with TanStack Query)
  const { tasks, isLoading: isLoadingTasks, isFetching: isRefreshingTasks, refetchTasks } = useCopilotTasks({
    enabled: isAuthenticated && !!user,
  });

  // Dialog & Window States
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showCenterBriefing, setShowCenterBriefing] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'chat'>('tasks');

  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Dragging: the launcher and the panel move independently inside a box that
  // starts below the navbar, so neither can be dragged over it (or off-screen).
  const launcherDrag = useDragControls();
  const panelDrag = useDragControls();
  const boundsRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLDivElement>(null);
  // A drag that ends on the launcher must not count as a click that opens it.
  const launcherDragged = useRef(false);
  // Reply being revealed word by word (only the newest copilot message).
  const [revealId, setRevealId] = useState<string | null>(null);

  const closePanel = () => setIsOpen(false);

  // Close on a click outside the panel, or on Escape. The conversation is kept.
  useEffect(() => {
    if (!isOpen || isMinimized) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || launcherRef.current?.contains(t)) return;
      // Clicks inside other dialogs (e.g. the daily briefing) are not "outside".
      if ((t as Element).closest?.('[role="dialog"]')) return;
      closePanel();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, isMinimized]);

  // Keep the newest message (or the thinking indicator) in view.
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isSending]);

  // Initial Welcome Briefing popup on login session
  useEffect(() => {
    if (isAuthenticated && user) {
      const hasSeenBriefing = sessionStorage.getItem(`${user.id}_vanguard_briefing_seen`);
      if (!hasSeenBriefing) {
        setShowCenterBriefing(true);
        sessionStorage.setItem(`${user.id}_vanguard_briefing_seen`, 'true');
      }
    }
  }, [isAuthenticated, user]);

  // Send a message (typed, or a suggestion chip, which sends straight away).
  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    const userMsg: CopilotMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: trimmed,
      timestamp: timeNow(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsSending(true);

    try {
      const response = await copilotService.chat(trimmed);
      const botMsg: CopilotMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'copilot',
        text: response.reply,
        timestamp: timeNow(),
        suggestions: response.suggestions,
        source: response.source,
        guardrail: response.guardrail,
        model: response.model,
      };
      setRevealId(botMsg.id);
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      // Not answered: mark the message as failed and give the text back so the
      // officer can retry without retyping (unless they already typed something new).
      setMessages((prev) => prev.map((m) => (m.id === userMsg.id ? { ...m, failed: true } : m)));
      setInputMessage((current) => current || trimmed);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'copilot',
          text: `Copilot is unavailable${err instanceof Error && err.message ? ` (${err.message})` : ''}. Your message was not answered and has been put back in the box — press send to retry.`,
          timestamp: timeNow(),
          source: undefined,
          guardrail: 'error',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    send(inputMessage);
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleTaskAction = (link?: string) => {
    if (link) {
      navigate(link);
      setIsOpen(false);
      setShowCenterBriefing(false);
    }
  };

  return (
    <>
      {/* ── Center Daily Operational Briefing Modal ── */}
      <DailyBriefingModal
        show={showCenterBriefing}
        onClose={() => setShowCenterBriefing(false)}
        tasks={tasks}
        isLoadingTasks={isLoadingTasks}
        onTaskAction={handleTaskAction}
      />

      {/* ── Floating launcher & panel, confined below the navbar ── */}
      <div ref={boundsRef} className="fixed left-0 right-0 bottom-0 top-[72px] pointer-events-none z-40">
        {(!isOpen || isMinimized) && (
          <motion.div
            ref={launcherRef}
            drag
            dragListener={false}
            dragControls={launcherDrag}
            dragMomentum={false}
            dragElastic={0}
            dragConstraints={boundsRef}
            onDragStart={() => {
              launcherDragged.current = true;
            }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 24 }}
            className="absolute bottom-6 right-6 pointer-events-auto touch-none"
          >
            {/* The float lives on an inner wrapper so it never fights the drag transform. */}
            <div className="group relative flex flex-col items-center">
              <span className="pointer-events-none absolute right-full top-4 mr-2 whitespace-nowrap rounded-lg bg-[#1e293b] px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg opacity-0 translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0">
                Ask Copilot
              </span>
              <div className="copilot-float relative">
                {tasks.some((t) => t.priority === 'Critical') && (
                  <span className="copilot-halo absolute inset-1 rounded-full bg-blue-400/30 pointer-events-none" aria-hidden="true" />
                )}
                <button
                  onPointerDown={(e) => {
                    launcherDragged.current = false;
                    launcherDrag.start(e);
                  }}
                  onClick={() => {
                    if (launcherDragged.current) return; // it was a drag, not a click
                    setIsOpen(true);
                    setIsMinimized(false);
                  }}
                  className="relative block rounded-2xl transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-105 active:scale-95 cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 drop-shadow-[0_8px_12px_rgba(15,23,42,.25)]"
                  title="Drag to move · click to open"
                  aria-label={`Open Vanguard Copilot${tasks.length ? `, ${tasks.length} tasks today` : ''}`}
                >
                  <CopilotMascot size={60} />
                  {tasks.length > 0 && (
                    <span className="absolute top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                      {tasks.length}
                    </span>
                  )}
                </button>
              </div>
              <span className="copilot-shadow mt-0.5 w-9 h-1.5 rounded-full bg-slate-900 blur-[2px]" aria-hidden="true" />
            </div>
          </motion.div>
        )}

        {isOpen && !isMinimized && (
          <motion.div
            ref={panelRef}
            drag
            dragListener={false}
            dragControls={panelDrag}
            dragMomentum={false}
            dragElastic={0}
            dragConstraints={boundsRef}
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: 'bottom right' }}
            role="dialog"
            aria-label="Vanguard Copilot"
            className="absolute bottom-6 right-6 pointer-events-auto w-[370px] sm:w-[400px] max-w-[calc(100vw-2.5rem)] h-[600px] max-h-[calc(100%-3rem)] bg-white rounded-2xl shadow-[0_24px_60px_-20px_rgba(15,23,42,.45)] border border-slate-200 flex flex-col overflow-hidden text-slate-800"
          >
            {/* Header (drag handle) */}
            <div
              onPointerDown={(e) => panelDrag.start(e)}
              className="px-4 py-3.5 bg-[#1e293b] text-white flex items-center justify-between shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <CopilotMascot size={38} tone="light" className="copilot-float shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white">Vanguard Copilot</h3>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                    AI assistant · verify before acting
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-0.5 text-slate-400" onPointerDown={(e) => e.stopPropagation()}>
                <button
                  onClick={() => refetchTasks(true)}
                  className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  title="Refresh tasks"
                  aria-label="Refresh tasks"
                >
                  <RefreshCw size={14} className={isRefreshingTasks ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  title="Minimise"
                  aria-label="Minimise copilot"
                >
                  <Minus size={15} />
                </button>
                <button
                  onClick={closePanel}
                  className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  title="Close"
                  aria-label="Close copilot"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-4 py-3 shrink-0 border-b border-slate-100">
              <div role="tablist" className="flex items-center bg-slate-100 rounded-lg p-0.5">
                {([
                  { key: 'tasks', label: "Today's tasks", count: tasks.length },
                  { key: 'chat', label: 'Ask Copilot', count: null },
                ] as const).map(({ key, label, count }) => {
                  const on = activeTab === key;
                  return (
                    <button key={key} role="tab" aria-selected={on} onClick={() => setActiveTab(key)}
                      className={`relative flex-1 py-1.5 text-xs font-semibold rounded-md cursor-pointer transition-colors ${on ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      {on && <motion.span layoutId="copilot-tab" className="absolute inset-0 bg-white rounded-md shadow-[0_1px_2px_rgba(15,23,42,.08)]" transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} />}
                      <span className="relative">{label}{count != null && <span className="text-slate-400 tabular-nums"> {count}</span>}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 bg-slate-50/60">
                {isLoadingTasks ? (
                  [0, 1, 2].map((i) => <div key={i} className="h-[58px] rounded-xl bg-slate-200/60 animate-pulse" />)
                ) : tasks.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm font-semibold text-slate-800">Nothing urgent right now</p>
                    <p className="text-xs text-slate-500 mt-1">Copilot will flag anything new.</p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {tasks.map((task, i) => (
                      <motion.div key={task.id}
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1], delay: i * 0.04 }}
                      >
                        <TaskCard task={task} onAction={handleTaskAction} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            )}

            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <div className="flex flex-col flex-1 min-h-0 bg-slate-50/50">
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {messages.length === 0 && (
                    <div className="px-3 pt-8 pb-4 text-center">
                      <CopilotMascot size={64} className="copilot-float mx-auto" />
                      <p className="mt-4 text-sm font-semibold text-slate-900">How can I help this shift?</p>
                      <p className="text-xs text-slate-500 mt-1">Ask about incidents, teams or supplies.</p>
                      <div className="mt-5 flex flex-col gap-1.5">
                        {STARTERS.map((q) => (
                          <button key={q} onClick={() => send(q)}
                            className="group w-full text-left text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg px-3 py-2 transition-colors cursor-pointer flex items-center justify-between gap-2">
                            {q}
                            <ChevronRight size={13} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((msg) => {
                    const clarifying = msg.sender === 'copilot' && msg.guardrail === 'clarify';
                    const refused =
                      msg.sender === 'copilot' && !!msg.guardrail && !['allow', 'error', 'clarify'].includes(msg.guardrail);
                    const errored = msg.sender === 'copilot' && (msg.guardrail === 'error' || msg.source === 'unavailable');
                    const bubble =
                      msg.sender === 'user'
                        ? `bg-blue-600 text-white rounded-br-none ${msg.failed ? 'opacity-60' : ''}`
                        : refused
                          ? 'bg-amber-50 border border-amber-300 text-amber-950 rounded-bl-none'
                          : clarifying
                            ? 'bg-indigo-50 border border-indigo-200 text-slate-800 rounded-bl-none'
                          : errored
                            ? 'bg-red-50 border border-red-200 text-red-900 rounded-bl-none'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none';
                    return (
                      <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs ${bubble}`}>
                          {refused && (
                            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 mb-1">
                              <ShieldAlert size={11} /> Declined · {GUARDRAIL_LABEL[msg.guardrail!] ?? 'Guardrail'}
                            </p>
                          )}
                          {clarifying && (
                            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-indigo-700 mb-1">
                              <MessageSquare size={11} /> Needs clarification
                            </p>
                          )}
                          {errored && (
                            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-red-700 mb-1">
                              <AlertTriangle size={11} /> {msg.source === 'unavailable' ? 'AI unavailable' : 'Not answered'}
                            </p>
                          )}
                          {msg.id === revealId ? (
                            <RevealText
                              text={msg.text}
                              onProgress={() => chatEndRef.current?.scrollIntoView({ block: 'end' })}
                              onDone={() => setRevealId(null)}
                            />
                          ) : (
                            <FormattedMessageText text={msg.text} isUser={msg.sender === 'user'} />
                          )}
                          <span
                            className={`text-[9px] block mt-1 ${
                              msg.sender === 'user' ? 'text-blue-200 text-right' : 'text-slate-400'
                            }`}
                          >
                            {msg.timestamp}
                            {msg.sender === 'user' && msg.failed && ' · not sent'}
                            {msg.sender === 'copilot' && msg.source === 'llm' &&
                              ` · AI-generated${modelLabel(msg.model) ? ` (${modelLabel(msg.model)})` : ''} — verify before acting`}
                            {msg.sender === 'copilot' && msg.source === 'guardrail' && ' · blocked by safety check'}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Suggestion chips */}
                  {isSending && <ThinkingBubble />}

                  {messages.length > 0 &&
                    !isSending &&
                    !revealId &&
                    messages[messages.length - 1]?.sender === 'copilot' &&
                    messages[messages.length - 1]?.suggestions &&
                    messages[messages.length - 1].suggestions!.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pl-1">
                        {messages[messages.length - 1].suggestions!.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => send(s)}
                            title="Send this question"
                            className="text-[11px] bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-full px-2.5 py-1 font-medium transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <ChevronRight size={10} />
                            {s}
                          </button>
                        ))}
                      </div>
                    )}

                  <div ref={chatEndRef} />
                </div>

                <form
                  onSubmit={handleSendMessage}
                  className="p-3 bg-white border-t border-slate-100 flex gap-2"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={isSending ? 'Copilot is thinking…' : 'Ask about incidents, teams or supplies'}
                    className="flex-1 px-3.5 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-xl placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-slate-300 focus:ring-4 focus:ring-blue-600/10 transition"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !inputMessage.trim()}
                    aria-label="Send message"
                    className="w-10 shrink-0 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl transition-colors cursor-pointer disabled:cursor-default"
                  >
                    {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </>
  );
};

/**
 * Shown while the copilot works. The reply is checked by the backend
 * (guardrails, figures) before it is returned, so the wait is spent there;
 * the label only grows more explicit when the wait is long.
 */
const ThinkingBubble: React.FC = () => {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  // Only the dots at first; a short status line appears under the bubble if the
  // wait gets long, so the officer knows it is still working (no "… Thinking…").
  const status =
    seconds < 4 ? null : seconds < 12 ? 'Checking live incidents, teams and stock' : 'Still working, the AI is slow right now';
  return (
    <div className="flex flex-col items-start gap-1" role="status" aria-live="polite">
      <div
        className="rounded-2xl rounded-bl-none bg-white border border-slate-200 px-4 py-3 shadow-xs flex items-center gap-1.5"
        aria-label="Copilot is thinking"
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
          />
        ))}
      </div>
      {status && <span className="text-[10px] text-slate-400 pl-1">{status}</span>}
    </div>
  );
};

/** Reveals a finished reply word by word (about 1.5 s at most); click to show it all. */
const RevealText: React.FC<{ text: string; onProgress?: () => void; onDone: () => void }> = ({ text, onProgress, onDone }) => {
  const words = React.useMemo(() => text.split(/(\s+)/), [text]);
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [shown, setShown] = useState(reduceMotion ? words.length : 0);
  useEffect(() => {
    if (shown >= words.length) {
      onDone();
      return;
    }
    const step = Math.max(2, Math.ceil(words.length / 60)); // ≤ ~60 frames
    const t = setTimeout(() => {
      setShown((n) => Math.min(words.length, n + step));
      onProgress?.();
    }, 25);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, words.length]);
  return (
    <div onClick={() => setShown(words.length)} className="cursor-text">
      <FormattedMessageText text={words.slice(0, shown).join('')} isUser={false} />
    </div>
  );
};

export default EocCopilotChatbot;
