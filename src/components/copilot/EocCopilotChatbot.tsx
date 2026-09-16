import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  X,
  Minus,
  Send,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  MessageSquare,
  ListTodo
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { copilotService } from '../../services/copilotService';
import type { CopilotTask, CopilotMessage } from '../../types';

// ── Markdown Formatter for Chatbot Text ──
const FormattedMessageText: React.FC<{ text: string; isUser?: boolean }> = ({ text, isUser }) => {
  const lines = text.split('\n');

  return (
    <div className="space-y-1">
      {lines.map((line, lIdx) => {
        if (!line.trim()) return <div key={lIdx} className="h-1" />;

        const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('- ') || line.trim().startsWith('• ');
        const cleanLine = isBullet ? line.trim().slice(2) : line;

        const parts: React.ReactNode[] = [];
        let remaining = cleanLine;
        let pKey = 0;

        while (remaining.length > 0) {
          // Bold **...** or __...__
          const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/);
          if (boldMatch) {
            parts.push(
              <strong key={pKey++} className={`font-extrabold ${isUser ? 'text-white' : 'text-slate-900'}`}>
                {boldMatch[2]}
              </strong>
            );
            remaining = remaining.slice(boldMatch[0].length);
            continue;
          }

          // Inline Code `...`
          const codeMatch = remaining.match(/^`([^`]+)`/);
          if (codeMatch) {
            parts.push(
              <code
                key={pKey++}
                className={`px-1 py-0.5 rounded text-[11px] font-mono ${
                  isUser ? 'bg-blue-700 text-white' : 'bg-slate-100 text-blue-600 font-semibold'
                }`}
              >
                {codeMatch[1]}
              </code>
            );
            remaining = remaining.slice(codeMatch[0].length);
            continue;
          }

          // Italic *...* or _..._
          const italicMatch = remaining.match(/^(\*|_)(.*?)\1/);
          if (italicMatch && !italicMatch[2].startsWith('*')) {
            parts.push(
              <em key={pKey++} className="italic">
                {italicMatch[2]}
              </em>
            );
            remaining = remaining.slice(italicMatch[0].length);
            continue;
          }

          // Plain text until next token
          const nextSpecial = remaining.search(/(\*\*|__|`|\*|_)/);
          if (nextSpecial === -1) {
            parts.push(<span key={pKey++}>{remaining}</span>);
            break;
          } else if (nextSpecial === 0) {
            parts.push(<span key={pKey++}>{remaining[0]}</span>);
            remaining = remaining.slice(1);
          } else {
            parts.push(<span key={pKey++}>{remaining.slice(0, nextSpecial)}</span>);
            remaining = remaining.slice(nextSpecial);
          }
        }

        if (isBullet) {
          return (
            <div key={lIdx} className="flex items-start gap-1.5 pl-1">
              <span className={`text-[10px] mt-0.5 font-bold ${isUser ? 'text-blue-200' : 'text-blue-600'}`}>•</span>
              <div className="flex-1">{parts}</div>
            </div>
          );
        }

        return <div key={lIdx}>{parts}</div>;
      })}
    </div>
  );
};

export const EocCopilotChatbot: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Closed by default on reload so it does not obstruct the UI
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'chat'>('tasks');
  const [tasks, setTasks] = useState<CopilotTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  if (!isAuthenticated || !user) {
    return null;
  }

  // Fetch today's focus tasks on load / login
  const fetchTasks = async () => {
    setIsLoadingTasks(true);
    try {
      const data = await copilotService.getTodayTasks();
      setTasks(data);
    } catch {
      // Fallback curated tasks if backend is unreachable
      // setTasks([
      //   {
      //     id: 'task-1',
      //     category: 'Incident Verification',
      //     priority: 'Critical',
      //     title: 'Review & Verify: Sungai Kelantan Overflow',
      //     description: 'River danger mark breached at Tangga Krai (11.20m). Ground verification needed.',
      //     actionLabel: 'Review Incident',
      //     link: '/situational/incidents',
      //     badge: 'Unverified Report',
      //     displayId: 'INC-2026-001',
      //   },
      //   {
      //     id: 'task-2',
      //     category: 'Logistics Alert',
      //     priority: 'High',
      //     title: 'Restock Requisition: 1,500 Food Packs',
      //     description: 'Dewan Jubli Perak relief shelter depot depleted due to 850 evacuee influx.',
      //     actionLabel: 'Open Logistics Depot',
      //     link: '/response/resources',
      //     badge: 'Low Stock',
      //     displayId: 'RES-001',
      //   },
      //   {
      //     id: 'task-3',
      //     category: 'Tactical SAR',
      //     priority: 'High',
      //     title: 'Monitor Extraction Mission: SMART Alpha',
      //     description: 'Active boat rescue operation underway in Hulu Langat sector.',
      //     actionLabel: 'View Rescue Ops',
      //     link: '/response/rescue',
      //     badge: 'In Progress',
      //     displayId: 'MIS-2026-001',
      //   },
      // ]);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user?.role]);

  // Initial welcome message in chat tab
  useEffect(() => {
    const welcomeName = user?.name || 'Officer';
    setMessages([
      {
        id: 'msg-welcome',
        sender: 'copilot',
        text: `Salutations, **${welcomeName}**! I am **Vanguard Sentinel**, your EOC operations assistant.\n\nI have loaded your **Today's Priority Task Focus** to optimize command decisions. You can ask me questions about active floods, available squads, or depot stock levels!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: ['Show today\'s priorities', 'What are the critical incidents?', 'Check available squads', 'Logistics status'],
      },
    ]);
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage.trim();
    if (!text || isSending) return;

    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsSending(true);

    try {
      const res = await copilotService.chat(text);
      const botMsg: CopilotMessage = {
        id: `bot-${Date.now()}`,
        sender: 'copilot',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: res.suggestions,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const fallbackBotMsg: CopilotMessage = {
        id: `bot-fallback-${Date.now()}`,
        sender: 'copilot',
        text: `Understood, ${user?.name || 'Officer'}. Operational telemetry indicates active flood monitoring across Kelantan and Pahang sectors. All EOC command layers are standing by.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: ['View All Incidents', 'Open Rescue Map', 'Inspect Logistics'],
      };
      setMessages((prev) => [...prev, fallbackBotMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleTaskAction = (link: string) => {
    navigate(link);
    setIsMinimized(true);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 select-none">
      <AnimatePresence>
        {/* ── Minimized Iconic "V" Sentinel Circular Launcher ── */}
        {(!isOpen || isMinimized) && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            className="flex items-center gap-2"
          >
            <button
              onClick={() => {
                setIsOpen(true);
                setIsMinimized(false);
              }}
              className="relative group w-12 h-12 rounded-full p-2.5 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white shadow-2xl hover:shadow-cyan-500/40 border border-blue-500/40 transition-all cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95 ring-1 ring-white/10"
              title="Open Vanguard AI Sentinel"
            >
              <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 opacity-40 blur-[3px] group-hover:opacity-100 transition duration-500 animate-pulse" />

              <div className="relative w-6 h-6 flex items-center justify-center">
                <svg viewBox="0 0 32 32" className="w-full h-full filter drop-shadow-[0_2px_6px_rgba(59,130,246,0.6)]">
                  <defs>
                    <linearGradient id="vanguardVGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="50%" stopColor="#60a5fa" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                    <linearGradient id="vanguardFacet" x1="100%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.2" />
                    </linearGradient>
                  </defs>
                  {/* Outer Chevron Frame */}
                  <polygon
                    points="3,6 16,28 29,6 23,6 16,19 9,6"
                    fill="url(#vanguardVGrad)"
                  />
                  {/* Left Facet Highlight */}
                  <polygon
                    points="3,6 16,28 16,19 9,6"
                    fill="url(#vanguardFacet)"
                    opacity="0.6"
                  />
                  {/* Inner Core Diamond */}
                  <polygon
                    points="16,3 19,8 16,13 13,8"
                    fill="#38bdf8"
                    className="animate-pulse"
                  />
                </svg>

                {/* Online Status Beacon */}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950 shadow-[0_0_8px_#34d399]" />
              </div>

              {/* Task Count Badge */}
              {tasks.length > 0 && (
                <span className="absolute -top-1 -left-1 px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[9px] font-black shadow-md border border-white/40">
                  {tasks.length}
                </span>
              )}

              {/* Hover Badge Pill */}
              <div className="absolute right-full mr-3 hidden group-hover:flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white text-[11px] font-semibold rounded-lg whitespace-nowrap shadow-xl">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Vanguard Sentinel</span>
              </div>
            </button>
          </motion.div>
        )}

        {/* ── Expanded Intelligent Copilot Assistant Panel ── */}
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 25 }}
            transition={{ duration: 0.2 }}
            className="w-[370px] sm:w-[420px] max-h-[580px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-slate-800"
            style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
          >
            {/* ── Top Header ── */}
            <div className="px-4 py-3 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-slate-900 flex items-center justify-center text-white shadow-md shadow-blue-500/30 border border-blue-400/30 p-1.5">
                  <svg viewBox="0 0 32 32" className="w-full h-full">
                    <polygon
                      points="3,6 16,28 29,6 23,6 16,19 9,6"
                      fill="#38bdf8"
                    />
                    <polygon
                      points="16,3 19,8 16,13 13,8"
                      fill="#ffffff"
                    />
                  </svg>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-extrabold tracking-wider text-white">VANGUARD SENTINEL</h3>
                  </div>
                  <p className="text-[10px] text-slate-300">Today's Focus & EOC Co-Pilot</p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-slate-400">
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
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-md hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  title="Dismiss"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* ── Tabs: Focus Tasks vs Interactive Chat ── */}
            <div className="flex border-b border-slate-100 bg-slate-50 shrink-0">
              <button
                onClick={() => setActiveTab('tasks')}
                className={`flex-1 py-2 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'tasks' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <ListTodo size={14} />
                <span>Today's Tasks ({tasks.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'chat' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <MessageSquare size={14} />
                <span>EOC Copilot Chat</span>
              </button>
            </div>

            {/* ── Tab 1: Today's Focus Task List ── */}
            {activeTab === 'tasks' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/50 max-h-[420px]">
                <div className="px-1 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Priority Focus for {user?.role || 'Admin'}</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Real-time Live
                  </span>
                </div>

                {isLoadingTasks ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-blue-500" />
                    <p>Compiling live situational tasks...</p>
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
                    <CheckCircle2 size={28} className="text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-800">All Operations Clear!</p>
                    <p className="text-[11px] text-slate-500 mt-1">No urgent pending actions require your intervention.</p>
                  </div>
                ) : (
                  tasks.map((task) => {
                    const isCrit = task.priority === 'Critical';
                    return (
                      <div
                        key={task.id}
                        className={`p-3 rounded-xl bg-white border transition-all hover:shadow-md ${
                          isCrit ? 'border-red-200 shadow-xs' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                                isCrit ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {task.priority}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                              {task.category}
                            </span>
                          </div>
                          {task.displayId && (
                            <span className="text-[10px] font-mono font-bold text-blue-600">{task.displayId}</span>
                          )}
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 leading-snug">{task.title}</h4>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{task.description}</p>

                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-medium">Due: {task.dueTime || 'Today'}</span>
                          <button
                            onClick={() => handleTaskAction(task.link)}
                            className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            <span>{task.actionLabel}</span>
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── Tab 2: Interactive Copilot Chat ── */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col overflow-hidden max-h-[420px] bg-slate-50/50">
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                          m.sender === 'user'
                            ? 'bg-blue-600 text-white rounded-br-xs shadow-xs'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs shadow-xs'
                        }`}
                      >
                        <FormattedMessageText text={m.text} isUser={m.sender === 'user'} />
                        <span
                          className={`block text-[9px] mt-1.5 text-right ${
                            m.sender === 'user' ? 'text-blue-200' : 'text-slate-400'
                          }`}
                        >
                          {m.timestamp}
                        </span>
                      </div>

                      {/* Suggested quick chips */}
                      {m.suggestions && m.suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {m.suggestions.map((s, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSendMessage(s)}
                              className="text-[10px] font-semibold bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 px-2.5 py-1 rounded-full transition-all cursor-pointer shadow-2xs hover:border-blue-400"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {isSending && (
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs p-2 bg-white rounded-xl border border-slate-100 w-fit">
                      <Bot size={14} className="animate-spin text-blue-500" />
                      <span>Sentinel thinking...</span>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Input Bar */}
                <div className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendMessage();
                    }}
                    placeholder="Ask Sentinel (e.g. 'Show critical floods')..."
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-slate-100 text-slate-900 border border-slate-200 focus:bg-white focus:border-blue-600 focus:outline-none"
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!inputMessage.trim() || isSending}
                    className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-colors cursor-pointer"
                  >
                    <Send size={13} />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EocCopilotChatbot;
