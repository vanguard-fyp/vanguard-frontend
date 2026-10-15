import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useDragControls } from 'framer-motion';
import {
  Bot,
  X,
  Minus,
  Send,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  MessageSquare,
  ListTodo,
  GripVertical,
  Loader2,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { copilotService } from '../../services/copilotService';
import type { CopilotTask, CopilotMessage } from '../../types';
import { DailyBriefingModal } from './DailyBriefingModal';
import { TaskCard } from './TaskCard';
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

export const EocCopilotChatbot: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Dialog & Window States
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showCenterBriefing, setShowCenterBriefing] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'chat'>('tasks');
  const [tasks, setTasks] = useState<CopilotTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

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

  // Fetch today's focus tasks on load
  const fetchTasks = async () => {
    setIsLoadingTasks(true);
    try {
      const data = await copilotService.getTodayTasks();
      setTasks(data);
    } catch {
      // Fallback
    } finally {
      setIsLoadingTasks(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAuthenticated]);

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
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute bottom-5 right-5 pointer-events-auto touch-none"
          >
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
              className="group relative flex items-center justify-center w-12 h-12 rounded-3xl bg-slate-800 text-white shadow-xl hover:bg-slate-700 border border-slate-700 transition-all cursor-grab active:cursor-grabbing hover:scale-105"
              title="Drag to reposition · Click to open"
              aria-label="Open Vanguard Copilot"
            >
              <img src="/favicon_io/favicon-32x32.png" alt="" className="w-10 h-10 pointer-events-none" />

              {tasks.length > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-black shadow-md border border-white">
                  {tasks.length}
                </span>
              )}
            </button>
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
            initial={{ opacity: 0, scale: 0.92, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 25 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-label="Vanguard Copilot"
            className="absolute bottom-5 right-5 pointer-events-auto w-[370px] sm:w-[420px] max-w-[calc(100vw-2.5rem)] h-[580px] max-h-[calc(100%-2.5rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-slate-800"
          >
            {/* Header (drag handle) */}
            <div
              onPointerDown={(e) => panelDrag.start(e)}
              className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800 cursor-grab active:cursor-grabbing select-none touch-none"
            >
              <div className="flex items-center gap-2.5">
                <GripVertical size={15} className="text-slate-500 shrink-0" />
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-md border border-slate-400/30">
                  <img
                    src="/favicon_io/favicon-32x32.png"
                    alt="Logo"
                    className="w-7 h-7"
                  />
                </div>
                <div>
                  <h3 className="text-xs font-bold tracking-wider text-white">VANGUARD COPILOT</h3>
                  <p className="text-[10px] text-slate-400">Drag to move · Esc or click outside to close</p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-slate-400" onPointerDown={(e) => e.stopPropagation()}>
                <button
                  onClick={fetchTasks}
                  className="p-1 rounded-md hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  title="Refresh tasks"
                >
                  <RefreshCw size={13} className={isLoadingTasks ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1 rounded-md hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  title="Minimize"
                >
                  <Minus size={14} />
                </button>
                <button
                  onClick={closePanel}
                  className="p-1 rounded-md hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  title="Close"
                  aria-label="Close copilot"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50 shrink-0">
              <button
                onClick={() => setActiveTab('tasks')}
                className={`flex-1 py-2 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'tasks'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <ListTodo size={14} />
                <span>Today's Tasks ({tasks.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'chat'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <MessageSquare size={14} />
                <span>EOC AI Chat</span>
              </button>
            </div>

            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 bg-slate-50/50">
                {isLoadingTasks ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-blue-500" />
                    <p>Compiling live tasks...</p>
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
                    <CheckCircle2 size={28} className="text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-800">All Operations Clear!</p>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <TaskCard key={task.id} task={task} onAction={handleTaskAction} />
                  ))
                )}
              </div>
            )}

            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <div className="flex flex-col flex-1 min-h-0 bg-slate-50/50">
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {messages.length === 0 && (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      <Bot size={28} className="mx-auto mb-2 text-slate-300" />
                      <p className="font-bold text-slate-700">How can I assist your shift today?</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Ask for incident verification advice, available rescue teams, or supply depot
                        status.
                      </p>
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
                            className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-full px-2.5 py-1 font-medium transition-colors cursor-pointer flex items-center gap-1"
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
                  className="p-2.5 bg-white border-t border-slate-200 flex gap-2"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={isSending ? 'Copilot is thinking…' : 'Ask Copilot assistant...'}
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !inputMessage.trim()}
                    className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl transition-colors cursor-pointer"
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
