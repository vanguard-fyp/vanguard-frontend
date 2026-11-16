import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Check, Camera, Loader2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useUpdateUser } from '../../../hooks';
import { userService } from '../../../services/userService';
import { PhoneInput, isValidMalaysianPhone, sanitizePhoneInput } from './PhoneInput';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateCurrentUser } = useAuth();
  const toast = useToast();
  const updateUser = useUpdateUser();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill all fields from auth user whenever modal opens
  useEffect(() => {
    if (isOpen && user) {
      setDisplayName(user.name || '');
      setEmail(user.email || '');
      setPhone(sanitizePhoneInput(user.phone_number || ''));
      setSubmitted(false);
      setPendingAvatarFile(null);
      setAvatarPreview(user.avatar_url || null);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Avatar file size must be less than 2MB.');
      return;
    }
    // Local preview only — upload happens on Save
    setPendingAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  // const handleRemovePhoto = () => {
  //   setPendingAvatarFile(null);
  //   setAvatarPreview(null);
  //   if (fileInputRef.current) fileInputRef.current.value = '';
  // };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitted(true);
    if (!displayName.trim() || !isValidMalaysianPhone(phone)) return;
    setIsSaving(true);

    try {
      // 1. Upload avatar to Supabase storage bucket only when saving
      let avatar_url: string | undefined;
      if (pendingAvatarFile) {
        avatar_url = await userService.uploadAvatar(pendingAvatarFile);
      }

      const updates: Record<string, string> = {
        name: displayName.trim(),
        email: email.trim(),
      };
      updates.phone_number = phone.trim();
      if (avatar_url) updates.avatar_url = avatar_url;

      await updateUser.mutateAsync({ id: user.id, updates });

      updateCurrentUser({
        name: displayName.trim(),
        email: email.trim(),
        phone_number: phone.trim(),
        ...(avatar_url ? { avatar_url } : {}),
      });

      toast.success('Profile updated successfully.');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Could not save profile. Please retry.');
    } finally {
      setIsSaving(false);
    }
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
                <h3 className="text-sm font-bold text-white">Officer Profile & Credentials</h3>
                <p className="text-[10px] text-slate-400">Update your name, contact, and profile photo</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} noValidate className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">

            {/* Avatar + Identity Card */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-4">
              <div className="relative shrink-0">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="w-14 h-14 rounded-full object-cover border-2 border-blue-600 shadow-xs"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-lg shadow-sm">
                    {displayName.slice(0, 2).toUpperCase() || 'OF'}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Select profile photo"
                  className="absolute bottom-0 right-0 p-1 bg-slate-900 hover:bg-blue-600 text-white rounded-full transition-colors shadow-xs cursor-pointer"
                >
                  <Camera size={12} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-900 truncate">{displayName || user?.name}</h4>
                  {/* {avatarPreview && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Trash2 size={11} /> Remove
                    </button>
                  )} */}
                </div>
                <p className="text-xs text-slate-500 font-medium">{user?.role || 'Officer'}</p>
                {pendingAvatarFile && (
                  <p className="text-[10px] text-amber-600 font-semibold mt-1">
                    Photo selected — will upload on Save
                  </p>
                )}
              </div>
            </div>

            {/* Name + Email */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="profile-display-name" className="block text-xs font-bold text-slate-800 mb-1">
                  Display Name <span className="text-rose-500" aria-hidden="true">*</span>
                </label>
                <input
                  type="text"
                  id="profile-display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  aria-required="true"
                  aria-invalid={submitted && !displayName.trim()}
                  className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none font-medium ${
                    submitted && !displayName.trim() ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-blue-600'}`}
                />
                {submitted && !displayName.trim() && (
                  <span className="block mt-1 text-[10px] text-rose-500 font-medium">Please enter your name</span>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Official Email</label>
                <div className="px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-medium select-none truncate">{email}</div>
                {/* <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-mono text-slate-700"
                /> */}
              </div>
            </div>

            {/* Phone + Agency (read-only) */}
            <div className="grid grid-cols-2 gap-3">
              {/* PhoneInput handles Malaysian formatting + validation */}
              <PhoneInput
                label="Phone Number"
                value={phone}
                onChange={setPhone}
                required
                submitted={submitted}
                showValidation
              />
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                  Agency
                </label>
                {/* Read-only — agency is managed by system admin */}
                <div className="px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-medium select-none truncate">
                  {user?.agency || '—'}
                </div>
              </div>
            </div>

            {/* Role — read-only */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Role</label>
              <div className="px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-medium select-none">
                {user?.role || '—'} <span className="text-slate-400 ml-1"></span>
              </div>
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
                disabled={isSaving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                {isSaving
                  ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                  : <><Check size={14} /> Save Profile</>}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
