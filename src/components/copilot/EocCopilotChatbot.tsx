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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { copilotService } from '../../services/copilotService';
import type { CopilotTask, CopilotMessage } from '../../types';
import { DailyBriefingModal } from './DailyBriefingModal';
import { TaskCard } from './TaskCard';
import { FormattedMessageText } from '../../utils/messageFormatter';

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

  // Draggable floating window — lets the user move the copilot off content it overlaps.
  const dragControls = useDragControls();
  const [dragBounds, setDragBounds] = useState({ top: -150, left: -400, right: 0, bottom: 0 });

  useEffect(() => {
    const updateBounds = () => {
      const panelHeight = isOpen && !isMinimized ? 580 : 60;
      const panelWidth = isOpen && !isMinimized ? 420 : 60;
      const navbarHeight = 75; // safe top margin to ensure header is never behind navbar
      const sidebarWidth = 270; // safe left margin to avoid sidebar overlap

      const maxTop = -Math.max(0, window.innerHeight - panelHeight - navbarHeight - 20);
      const maxLeft = -Math.max(0, window.innerWidth - panelWidth - sidebarWidth - 20);

      setDragBounds({
        top: maxTop,
        left: maxLeft,
        right: 0,
        bottom: 0,
      });
    };

    updateBounds();
    window.addEventListener('resize', updateBounds);
    return () => window.removeEventListener('resize', updateBounds);
  }, [isOpen, isMinimized]);

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

  if (!isAuthenticated || !user) {
    return null;
  }

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
    fetchTasks();
  }, [user]);

  // Handle User Chat Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputMessage.trim();
    if (!trimmed || isSending) return;

    const userMsg: CopilotMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }),
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
        timestamp: new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }),
        suggestions: response.suggestions,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'copilot',
          text: 'Copilot is temporarily unavailable. Please try again.',
          timestamp: new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSending(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

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
        userName={user.name}
        userRole={user.role}
        onTaskAction={handleTaskAction}
      />

      {/* ── Floating Draggable Trigger & Panel ── */}
      <motion.div
        drag
        dragListener={false}
        dragControls={dragControls}
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={dragBounds}
        className="fixed bottom-5 right-5 z-50 touch-none"
      >
        {(!isOpen || isMinimized) && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative">
            <button
              onClick={() => {
                setIsOpen(true);
                setIsMinimized(false);
              }}
              onPointerDown={(e) => dragControls.start(e)}
              className="group relative flex items-center justify-center w-12 h-12 rounded-3xl bg-slate-800 text-white shadow-xl hover:bg-slate-700 border border-slate-700 transition-all cursor-grab active:cursor-grabbing hover:scale-105"
              title="Drag to reposition · Click to open"
            >
              <img src="/favicon_io/favicon-32x32.png" alt="Logo" className="w-10 h-10 pointer-events-none" />

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
            initial={{ opacity: 0, scale: 0.92, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 25 }}
            transition={{ duration: 0.2 }}
            className="w-[370px] sm:w-[420px] max-h-[580px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-slate-800"
          >
            {/* Header (drag handle) */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800 cursor-grab active:cursor-grabbing select-none"
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
                  <p className="text-[10px] text-slate-400">Drag to move · Situational AI & Tasks</p>
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
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-md hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  title="Dismiss"
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
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/50 max-h-[420px]">
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
              <div className="flex flex-col flex-1 h-[420px] bg-slate-50/50">
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

                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs ${
                          msg.sender === 'user'
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                        }`}
                      >
                        <FormattedMessageText text={msg.text} isUser={msg.sender === 'user'} />
                        <span
                          className={`text-[9px] block mt-1 ${
                            msg.sender === 'user' ? 'text-blue-200 text-right' : 'text-slate-400'
                          }`}
                        >
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Suggestion chips */}
                  {messages.length > 0 &&
                    messages[messages.length - 1]?.sender === 'copilot' &&
                    messages[messages.length - 1]?.suggestions &&
                    messages[messages.length - 1].suggestions!.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pl-1">
                        {messages[messages.length - 1].suggestions!.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setInputMessage(s);
                            }}
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
                    placeholder="Ask Copilot assistant..."
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !inputMessage.trim()}
                    className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl transition-colors cursor-pointer"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </>
  );
};

export default EocCopilotChatbot;
