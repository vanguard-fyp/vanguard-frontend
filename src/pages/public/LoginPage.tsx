import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Lock, Mail, ArrowRight, AlertCircle, Activity, Shield, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { AdminRoleOption, UserRole } from '../../types';
import { PAPER, INK, BLUE } from '../../constants';

// TODO: Make this real login
const ADMIN_ROLES: AdminRoleOption[] = [
  {
    role: 'NADMA Lead Officer',
    label: 'Lead Officer (Superadmin)',
    badge: 'Federal Level 3',
    email: 'lead.officer@nadma.gov.my',
    name: "Dato' Ir. Ahmad Rosli",
    description: 'Federal command, incident deletion, policy overrides & system admin.',
  },
  {
    role: 'Disaster Management Officer',
    label: 'Operations Officer',
    badge: 'Command & Ops',
    email: 'ops.commander@nadma.gov.my',
    name: 'Col. Ahmad Razif',
    description: 'Incident verification, tactical dispatch, resolution & sitrep reporting.',
  },
];

const BLIPS = [
  { x: 55, y: 25 },
  { x: 28, y: 52 },
  { x: 72, y: 60 },
  { x: 46, y: 78 },
  { x: 78, y: 32 },
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithRole, login, isLoading } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  const [selectedRole, setSelectedRole] = useState<UserRole>('NADMA Lead Officer');
  const [email, setEmail] = useState<string>('lead.officer@nadma.gov.my');
  const [password, setPassword] = useState<string>('••••••••••••');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSelectRole = (roleOption: AdminRoleOption) => {
    setSelectedRole(roleOption.role);
    setEmail(roleOption.email);
    setErrorMsg(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      try {
        await loginWithRole(selectedRole);
        navigate('/dashboard');
      } catch (err: any) {
        setErrorMsg(err.message || 'Authentication error');
      }
    }
  };

  return (
    <div className="min-h-screen font-sans flex flex-col" style={{ backgroundColor: PAPER, color: INK }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,500;0,600&family=Public+Sans:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Newsreader', serif; }
        .font-ui { font-family: 'Public Sans', sans-serif; }
        @keyframes drift { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(20px,-16px); } }
      `}</style>

      {/* ── Top Header with Logo linking to Public Portal (/) ── */}
      <header className="font-ui border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: `${INK}1a` }}>
        <Link to="/" className="flex items-baseline gap-2 hover:opacity-80 transition-opacity" title="Return to Public Portal">
          <span className="font-display text-xl font-semibold">Vanguard</span>
          <span className="text-sm" style={{ color: `${INK}99` }}>Operator sign in</span>
        </Link>
        <Link to="/" className="text-sm font-semibold hover:opacity-70 transition-opacity">
          Public portal
        </Link>
      </header>

      {/* ── Main Login Layout ── */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2">
        {/* Left: Form & Role Switcher */}
        <div className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <h1 className="font-display text-3xl font-medium mb-1">Operator Sign In</h1>
            <p className="font-ui text-sm mb-6" style={{ color: `${INK}99` }}>
              Sign in with your authorized agency credentials or switch roles below.
            </p>

            {/* ── 2-Role Mock Switcher ── */}
            <div className="font-ui mb-6 p-3 rounded-md border" style={{ borderColor: `${INK}1a`, backgroundColor: '#fff' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Shield size={12} className="text-blue-600" />
                  Select Active Admin Role
                </span>
                <span className="text-[11px] font-medium text-slate-400">2-Role RBAC</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ADMIN_ROLES.map((r) => {
                  const isSelected = selectedRole === r.role;
                  return (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => handleSelectRole(r)}
                      className={`text-left p-2.5 rounded border transition-all cursor-pointer ${isSelected
                          ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                          {r.badge}
                        </span>
                        {isSelected && <UserCheck size={12} className="text-blue-600" />}
                      </div>
                      <p className="text-xs font-bold text-slate-900 leading-tight truncate">{r.name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug line-clamp-2">{r.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {errorMsg && (
              <div className="font-ui mb-5 p-3 text-sm rounded-sm border flex items-center gap-2" style={{ borderColor: '#dc262666', color: '#dc2626', backgroundColor: '#dc26260d' }}>
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="font-ui space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">Official Agency Email</label>
                <div className="relative">
                  <Mail className="absolute left-0 top-1/2 -translate-y-1/2" size={17} style={{ color: `${INK}66` }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-7 pr-1 py-2 bg-transparent border-b text-sm focus:outline-none transition-colors"
                    style={{ borderColor: `${INK}33` }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = BLUE)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = `${INK}33`)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-0 top-1/2 -translate-y-1/2" size={17} style={{ color: `${INK}66` }} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-7 pr-1 py-2 bg-transparent border-b text-sm focus:outline-none transition-colors"
                    style={{ borderColor: `${INK}33` }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = BLUE)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = `${INK}33`)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-3 py-3.5 text-sm font-semibold rounded-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60 cursor-pointer shadow-xs"
                style={{ backgroundColor: BLUE, color: '#fff' }}
              >
                {isLoading ? (
                  <motion.span
                    className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full inline-block"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                  />
                ) : (
                  <>
                    Sign in to Command Center
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            <div className="font-ui mt-6 pt-4 border-t flex items-center justify-between text-xs" style={{ borderColor: `${INK}1a`, color: `${INK}80` }}>
              <span>Role: <strong className="text-slate-800">{selectedRole}</strong></span>
              <span className="font-mono text-[11px]">JWT / TLS 256-bit</span>
            </div>
          </div>
        </div>

        {/* Right: Live Monitoring Graphic */}
        <div className="relative hidden lg:flex items-center justify-center overflow-hidden" style={{ backgroundColor: INK }}>
          <div
            className="absolute w-72 h-72 rounded-full opacity-30 blur-3xl"
            style={{ backgroundColor: BLUE, animation: prefersReducedMotion ? 'none' : 'drift 10s ease-in-out infinite' }}
          />
          <div className="relative" style={{ width: 300, height: 300 }}>
            <svg viewBox="0 0 100 100" className="absolute inset-0">
              {[16, 30, 44].map((r) => (
                <circle key={r} cx="50" cy="50" r={r} fill="none" stroke={`${BLUE}44`} strokeWidth="0.5" />
              ))}
              {!prefersReducedMotion && (
                <motion.g
                  animate={{ rotate: 360 }}
                  transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
                  style={{ transformOrigin: '50px 50px', transformBox: 'view-box' }}
                >
                  <path d="M50 50 L50 6 A44 44 0 0 1 84 27 Z" fill={`${BLUE}26`} />
                </motion.g>
              )}
              {BLIPS.map((b, i) => (
                <motion.circle
                  key={i}
                  cx={b.x}
                  cy={b.y}
                  r="2"
                  fill={BLUE}
                  animate={prefersReducedMotion ? {} : { opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.35 }}
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center font-ui">
              <span className="text-base font-semibold" style={{ color: PAPER }}>EOC System Status</span>
              <span className="text-sm flex items-center gap-1 mt-1" style={{ color: BLUE }}>
                <Activity size={13} /> Active Operational Readiness
              </span>
              <span className="text-xs mt-3" style={{ color: `${PAPER}66` }}>Multi-agency synchronization online</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="font-ui border-t py-4 px-6 text-center text-sm" style={{ borderColor: `${INK}1a`, color: `${INK}80` }}>
        NADMA Malaysia — Vanguard Disaster Operations Center
      </footer>
    </div>
  );
};

export default LoginPage;