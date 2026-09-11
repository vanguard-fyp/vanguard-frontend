/**
 * ToastContext.tsx
 * Lightweight toast notification system with Framer Motion animations.
 * Provides useToast() hook for triggering CRUD feedback across the app.
 */
import React, { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
}

interface ToastContextValue {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

// ── Variant Config ────────────────────────────────────────────────────────────

const VARIANT_CONFIG: Record<
  ToastVariant,
  { icon: React.ReactNode; border: string; title: string; bar: string }
> = {
  success: {
    icon: <CheckCircle size={16} className="text-emerald-600" />,
    border: 'border-l-emerald-500',
    title: 'text-emerald-900',
    bar: 'bg-emerald-500',
  },
  error: {
    icon: <XCircle size={16} className="text-red-600" />,
    border: 'border-l-red-500',
    title: 'text-red-900',
    bar: 'bg-red-500',
  },
  warning: {
    icon: <AlertTriangle size={16} className="text-amber-600" />,
    border: 'border-l-amber-500',
    title: 'text-amber-900',
    bar: 'bg-amber-500',
  },
  info: {
    icon: <Info size={16} className="text-blue-600" />,
    border: 'border-l-blue-500',
    title: 'text-blue-900',
    bar: 'bg-blue-500',
  },
};

const DURATION_MS = 4000;

// ── ToastItem Component ───────────────────────────────────────────────────────

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  const cfg = VARIANT_CONFIG[toast.variant];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className={`relative flex items-start gap-3 w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 ${cfg.border} border-l-4 rounded-xl shadow-xl px-4 py-3 overflow-hidden`}
    >
      {/* Progress bar */}
      <motion.div
        className={`absolute bottom-0 left-0 h-0.5 ${cfg.bar}`}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: DURATION_MS / 1000, ease: 'linear' }}
      />

      {/* Icon */}
      <div className="shrink-0 mt-0.5">{cfg.icon}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-extrabold ${cfg.title} leading-snug`}>{toast.title}</p>
        {toast.message && (
          <p className="text-[11px] text-slate-600 font-medium mt-0.5 leading-snug">
            {toast.message}
          </p>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer mt-0.5"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
};

// ── Provider ──────────────────────────────────────────────────────────────────

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev.slice(-4), { ...toast, id }]);
      setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss]
  );

  const success = useCallback(
    (title: string, message?: string) => showToast({ variant: 'success', title, message }),
    [showToast]
  );
  const error = useCallback(
    (title: string, message?: string) => showToast({ variant: 'error', title, message }),
    [showToast]
  );
  const warning = useCallback(
    (title: string, message?: string) => showToast({ variant: 'warning', title, message }),
    [showToast]
  );
  const info = useCallback(
    (title: string, message?: string) => showToast({ variant: 'info', title, message }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}

      {/* Toast Container — bottom-right */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto">
              <ToastItem toast={t} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
