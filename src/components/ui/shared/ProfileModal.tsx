import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Globe, Check } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const toast = useToast();

  const [displayName, setDisplayName] = useState(user?.name);
  const [email, setEmail] = useState(user?.email);
  const [language, setLanguage] = useState<'English (UK/MY)' | 'Bahasa Melayu'>('English (UK/MY)');
  const [locale, setLocale] = useState<'en-MY' | 'ms-MY'>('en-MY');
  const [notificationSound, setNotificationSound] = useState(true);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Officer profile and locale preferences saved!');
    onClose();
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
                <User size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">My Officer Profile & Preferences</h3>
                <p className="text-[10px] text-slate-400">Personal credentials, language, and regional locale</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Identity Card */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-base shadow-sm">
                {displayName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{displayName}</h4>
                <p className="text-xs text-slate-500">{user?.role || 'Emergency Response Commander'}</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 inline-block mt-1">
                  Active Verified Session
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Official Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-mono text-slate-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <Globe size={13} className="text-blue-600" />
                  <span>System Language</span>
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 cursor-pointer"
                >
                  <option value="English (UK/MY)">English (Malaysia)</option>
                  <option value="Bahasa Melayu">Bahasa Melayu</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Date & Number Locale</label>
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 cursor-pointer font-mono"
                >
                  <option value="en-MY">en-MY (DD/MM/YYYY, RM)</option>
                  <option value="ms-MY">ms-MY (DD/MM/YYYY, RM)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Critical Audio Alerts</p>
                <p className="text-[11px] text-slate-500">Play alert sound when severe Level 3 disaster arrives</p>
              </div>
              <button
                type="button"
                onClick={() => setNotificationSound(!notificationSound)}
                className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative p-0.5 ${notificationSound ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform ${notificationSound ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>Save Preferences</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
