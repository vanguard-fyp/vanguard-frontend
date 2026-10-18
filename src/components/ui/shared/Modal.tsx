import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, X, type LucideIcon } from 'lucide-react';

/* ============================================================
   Modals in the operations app.
   - Forms (report, update, resolve, reject) get the sidebar-navy header
     with an icon tile that names the job.
   - Confirmations (archive, verify) are a small white dialog with a
     tinted icon tile: red for destructive, blue otherwise.
   Every modal has a header icon; field labels never do. Icons inside
   inputs (search, phone) stay, because they show what to type.
   Overlays render into document.body so a transformed page container
   can never clip them.
   ============================================================ */

export const NAVY = '#1e293b';

export const inputCls =
  'w-full px-3 py-2 text-[13px] text-slate-900 bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition disabled:opacity-60 disabled:bg-slate-50';

export const labelCls = 'block text-xs font-semibold text-slate-700 mb-1.5';

/** Render an overlay at the top of the document. */
export const Overlay: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  typeof document === 'undefined' ? <>{children}</> : createPortal(children, document.body);

interface ShellProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
  labelledBy?: string;
}

const Shell: React.FC<ShellProps> = ({ open, onClose, children, width = 'max-w-lg', labelledBy }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <Overlay>
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-[2px]"
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={labelledBy}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={`w-full ${width} bg-white rounded-2xl shadow-[0_24px_60px_-20px_rgba(15,23,42,.45)] overflow-hidden flex flex-col max-h-[92vh]`}
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Overlay>
  );
};

/** Icon tile on the navy header. */
export const NavyIcon: React.FC<{ icon: LucideIcon }> = ({ icon: Icon }) => (
  <span className="w-9 h-9 rounded-lg bg-blue-600 ring-1 ring-inset ring-white/10 flex items-center justify-center shrink-0 text-white">
    <Icon size={17} strokeWidth={2} />
  </span>
);

interface FormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  icon: LucideIcon;
  /** One short line: the record it is about, never instructions. */
  subtitle?: React.ReactNode;
  width?: string;
  onSubmit?: (e: React.FormEvent) => void;
  footer: React.ReactNode;
  children: React.ReactNode;
}

/** Form modal: navy header with icon, scrolling body, fixed footer. */
export const FormModal: React.FC<FormModalProps> = ({ open, onClose, title, icon, subtitle, width, onSubmit, footer, children }) => {
  const id = `modal-${title.replace(/\W+/g, '-').toLowerCase()}`;
  const Body = onSubmit ? 'form' : 'div';
  return (
    <Shell open={open} onClose={onClose} width={width} labelledBy={id}>
      <header className="px-6 py-4 flex items-center justify-between gap-4 text-white shrink-0" style={{ background: NAVY }}>
        <div className="flex items-center gap-3 min-w-0">
          <NavyIcon icon={icon} />
          <div className="min-w-0">
            <h3 id={id} className="text-[15px] font-bold leading-snug">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close"
          className="p-1 -mr-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
          <X size={18} />
        </button>
      </header>
      <Body {...(onSubmit ? { onSubmit, noValidate: true } : {})} className="flex flex-col min-h-0 flex-1">
        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">{children}</div>
        <footer className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">{footer}</footer>
      </Body>
    </Shell>
  );
};

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  icon: LucideIcon;
  children?: React.ReactNode;
  confirmLabel: string;
  pending?: boolean;
  danger?: boolean;
}

/** Small confirmation: icon tile, title, one line, two buttons. */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({ open, onClose, onConfirm, title, icon: Icon, children, confirmLabel, pending, danger }) => {
  const id = `confirm-${title.replace(/\W+/g, '-').toLowerCase()}`;
  const c = danger ? '#dc2626' : '#2563eb';
  return (
    <Shell open={open} onClose={onClose} width="max-w-sm" labelledBy={id}>
      <div className="px-6 pt-6 pb-5 flex items-start gap-4">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${c}14`, color: c }}>
          <Icon size={19} strokeWidth={2} />
        </span>
        <div className="min-w-0 pt-0.5">
          <h3 id={id} className="text-base font-bold text-slate-900">{title}</h3>
          {children && <div className="text-[13px] text-slate-500 mt-1 leading-relaxed">{children}</div>}
        </div>
      </div>
      <footer className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
        <GhostButton onClick={onClose}>Cancel</GhostButton>
        <PrimaryButton onClick={onConfirm} pending={pending} danger={danger}>{confirmLabel}</PrimaryButton>
      </footer>
    </Shell>
  );
};

export const GhostButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', type = 'button', ...p }) => (
  <button type={type} {...p}
    className={`px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer ${className}`} />
);

export const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { pending?: boolean; danger?: boolean }> = ({
  className = '', type = 'button', pending, danger, disabled, children, ...p
}) => (
  <button type={type} disabled={disabled || pending} {...p}
    className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed
      ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} ${className}`}>
    {pending && <Loader2 size={13} className="animate-spin" />}
    {children}
  </button>
);

/** Label + control + optional error. `note` sits beside the label (e.g. "0 to 100"). */
export const Field: React.FC<{
  label: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  note?: React.ReactNode;
  error?: string;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ label, required, optional, note, error, aside, className = '', children }) => {
  // Tie the label to its control so clicking the label focuses it and screen readers name it.
  const autoId = useId();
  const child = React.isValidElement<{ id?: string; 'aria-invalid'?: boolean }>(children) ? children : null;
  const id = child?.props.id ?? autoId;
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className={labelCls}>
          {label}
          {required && <span className="text-red-600 ml-0.5">*</span>}
          {optional && <span className="font-normal text-slate-400 ml-1.5">optional</span>}
          {note && <span className="font-normal text-slate-400 ml-1.5">{note}</span>}
        </label>
        {aside && <span className="mb-1.5">{aside}</span>}
      </div>
      {child ? React.cloneElement(child, { id, 'aria-invalid': error ? true : undefined }) : children}
      {error && <p className="text-[11px] font-medium text-red-600 mt-1">{error}</p>}
    </div>
  );
};

/** A group of related fields, split from the next by a hairline. No heading. */
export const FormSection: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="space-y-4 pt-5 border-t border-slate-100 first:pt-0 first:border-t-0">{children}</div>
);
