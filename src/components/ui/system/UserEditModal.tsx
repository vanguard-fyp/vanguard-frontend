import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Check, UserCheck, Camera, Loader2, Upload } from 'lucide-react';
import type { UserEditModalProps, UserRole } from '../../../types';
import { userRolesList as rolesList, agencyOptions } from '../../../constants';
import { useUploadAvatar } from '../../../hooks';
import { useToast } from '../../../context/ToastContext';
import { formatMalaysianPhone, isValidMalaysianPhone } from '../shared/PhoneInput';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const UserEditModal: React.FC<UserEditModalProps> = ({
  isOpen,
  user,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [agency, setAgency] = useState('NADMA Malaysia');
  const [role, setRole] = useState<UserRole>('Disaster Management Officer');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [nameDirty, setNameDirty] = useState(false);
  const [emailDirty, setEmailDirty] = useState(false);
  const [phoneDirty, setPhoneDirty] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAvatar = useUploadAvatar();
  const toast = useToast();

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone_number || '');
      setAgency(user.agency);
      setRole(user.role);
      setStatus(user.status);
      setAvatarUrl(user.avatar_url);
      setAvatarPreview(user.avatar_url || null);
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setAgency('NADMA Malaysia');
      setRole('Disaster Management Officer');
      setStatus('Active');
      setAvatarUrl(undefined);
      setAvatarPreview(null);
    }
    setNameDirty(false);
    setEmailDirty(false);
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);

    try {
      const publicUrl = await uploadAvatar.mutateAsync(file);
      setAvatarUrl(publicUrl);
      toast.success('Profile photo uploaded successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Avatar upload failed. Please try again.');
      setAvatarPreview(user?.avatar_url || null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Email can only be entered when creating an account; it is read only when editing
    const emailValid = EMAIL_PATTERN.test(email.trim());
    if (!name.trim() || !email.trim() || (!user && !emailValid) || !isValidMalaysianPhone(phone)) {
      setNameDirty(true);
      setEmailDirty(true);
      setPhoneDirty(true);
      return;
    }

    onSave({
      id: user ? user.id : undefined,
      name,
      email: email.trim(),
      phone_number: phone.trim(),
      agency,
      role,
      status: user ? status : 'Active',
      last_active: user ? user.last_active : 'Just now',
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    });
    onClose();
  };

  const initials = name.trim()
    ? name.trim().split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        onClick={(e) => e.stopPropagation()}
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
        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          {/* Avatar Upload Section */}
          <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            {/* Avatar Preview */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-200 bg-blue-50 flex items-center justify-center">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Profile avatar preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-bold text-blue-600">{initials}</span>
                )}
              </div>
              {/* Upload overlay button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadAvatar.isPending}
                className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 border-2 border-white flex items-center justify-center text-white cursor-pointer transition-colors disabled:opacity-60 shadow-md"
                title="Upload profile photo"
              >
                {uploadAvatar.isPending ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <Camera size={10} />
                )}
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-700">Profile Photo</p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Upload a JPG, PNG or WebP file (max 5 MB). Stored in Supabase bucket.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadAvatar.isPending}
                className="mt-2 flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 hover:border-blue-400 text-slate-600 hover:text-blue-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-60"
              >
                <Upload size={11} />
                {uploadAvatar.isPending ? 'Uploading…' : 'Choose Photo'}
              </button>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
              Full Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameDirty(true);
              }}
              placeholder="e.g. Dato' Ir. Ahmad Rosli"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 transition-colors"
            />
            {name.trim() === "" && nameDirty && <span className="text-xs text-red-600 font-medium mt-0.5 p-1">Please input the name</span>}
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
              Email Address {user ? '(read only)' : <span className="text-red-600">*</span>}
            </label>
            {user ? (
              <div className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition-colors">
                {email}
              </div>
            ) : (
              <>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailDirty(true);
                  }}
                  placeholder="e.g. rosli@nadma.gov.my"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600 font-mono transition-colors"
                />
                {email.trim() === "" && emailDirty && <span className="text-xs text-red-600 font-medium mt-0.5 p-1">Please input the email</span>}
                {email.trim() !== "" && emailDirty && !EMAIL_PATTERN.test(email.trim()) && <span className="text-xs text-red-600 font-medium mt-0.5 p-1">Please input a valid email</span>}
              </>
            )}
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
              Phone Number <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={formatMalaysianPhone(phone)}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => setPhoneDirty(true)}
              required
              placeholder="+60-12-345 6789"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600 font-mono transition-colors"
            />
            {phoneDirty && !isValidMalaysianPhone(phone) && <span className="text-xs text-red-600 font-medium mt-0.5 p-1">{phone.trim() ? 'Please input a valid Malaysian number' : 'Please input the phone number'}</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                Agency Organization
              </label>
              <select
                value={agency}
                onChange={(e) => setAgency(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer"
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
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer"
              >
                {rolesList.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Account Status: Only shown during Edit (New users default to Active) */}
          {user && (
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
          )}

          {!user && (
            <p className="text-[11px] text-slate-500 leading-relaxed">
              We will email an invite link to this address. The officer sets their own password from that link.
            </p>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploadAvatar.isPending}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-60"
            >
              <Check size={14} />
              {user ? 'Save Changes' : 'Create & send invite'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
