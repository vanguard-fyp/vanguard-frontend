import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Check, UserCheck } from 'lucide-react';
import type { UserAccount, UserRole } from '../../../types';
import { userRolesList as rolesList, agencyOptions } from '../../../constants';

interface UserEditModalProps {
  isOpen: boolean;
  user: UserAccount | null;
  onClose: () => void;
  onSave: (data: Partial<UserAccount>) => void;
}

export const UserEditModal: React.FC<UserEditModalProps> = ({
  isOpen,
  user,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [agency, setAgency] = useState('NADMA Malaysia');
  const [role, setRole] = useState<UserRole>('Disaster Management Officer');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setAgency(user.agency);
      setRole(user.role);
      setStatus(user.status);
    } else {
      setName('');
      setEmail('');
      setAgency('NADMA Malaysia');
      setRole('Disaster Management Officer');
      setStatus('Active');
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    onSave({
      id: user ? user.id : undefined,
      name,
      email,
      agency,
      role,
      status,
      lastActive: user ? user.lastActive : 'Just now',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck size={18} className="text-blue-400" />
            <h3 className="text-sm font-bold">
              {user ? `Configure Account: ${user.name}` : 'Create New User Account'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
              Full Officer Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dato' Ir. Ahmad Rosli"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 transition-colors"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
              Official Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. rosli@nadma.gov.my"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600 font-mono transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                Agency Organization
              </label>
              <select
                value={agency}
                onChange={(e) => setAgency(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
              >
                {agencyOptions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                Operational Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
              >
                {rolesList.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
              Account Status
            </label>
            <div className="flex items-center gap-3">
              {(['Active', 'Inactive'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatus(st)}
                  className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    status === st
                      ? st === 'Active'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                        : 'bg-red-50 text-red-800 border-red-300 shadow-2xs'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Check size={14} />
              {user ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
