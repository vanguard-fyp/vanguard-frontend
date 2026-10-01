import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Lock, Mail, ArrowRight, AlertCircle, Activity, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PAPER, INK, BLUE } from '../../constants';

const BLIPS = [
  { x: 55, y: 25 },
  { x: 28, y: 52 },
  { x: 72, y: 60 },
  { x: 46, y: 78 },
  { x: 78, y: 32 },
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Validate email format without relying on the browser's native bubble.
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const showEmailError = emailTouched && email.length > 0 && !emailValid;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err: any) {
      // Surface the backend error message directly — it already distinguishes
      // between wrong credentials and role-gate rejections.
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        'Authentication failed. Please check your credentials.';
      setErrorMsg(detail);
    }
  };

  return (
    <div
      className="min-h-screen font-sans flex flex-col"
      style={{ backgroundColor: PAPER, color: INK }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,500;0,600&family=Public+Sans:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Newsreader', serif; }
        .font-ui { font-family: 'Public Sans', sans-serif; }
        @keyframes drift { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(20px,-16px); } }
      `}</style>

      {/* ── Top Header ── */}
      <header
        className="font-ui border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: `${INK}1a` }}
      >
        <Link
          to="/"
          className="flex items-baseline gap-2 hover:opacity-80 transition-opacity"
          title="Return to Public Portal"
        >
          <span className="font-display text-xl font-semibold"><span className="bg-gradient-to-b from-blue-400 via-blue-600 to-blue-900 bg-clip-text text-transparent">
            V
          </span>anguard</span>
        </Link>
        {/* <Link to="/" className="text-sm font-semibold hover:opacity-70 transition-opacity">
          Public portal
        </Link> */}
      </header>

      {/* ── Main Layout ── */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2">
        {/* Left: Login Form */}
        <div className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <h1 className="font-display text-3xl font-medium mb-1">Operator Sign In</h1>
            <p className="font-ui text-sm mb-8" style={{ color: `${INK}99` }}>
              Sign in with your authorized NADMA agency credentials.
            </p>

            {errorMsg && (
              <div
                className="font-ui mb-5 p-3 text-sm rounded border flex items-start gap-2"
                style={{
                  borderColor: '#dc262666',
                  color: '#dc2626',
                  backgroundColor: '#dc26260d',
                }}
              >
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="font-ui space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  Official Agency Email
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-0 top-1/2 -translate-y-1/2"
                    size={17}
                    style={{ color: showEmailError ? '#dc2626' : `${INK}66` }}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    autoComplete="username"
                    placeholder="you@nadma.gov.my"
                    className="w-full pl-7 pr-1 py-2 bg-transparent border-b text-sm focus:outline-none transition-colors"
                    style={{
                      borderColor: showEmailError
                        ? '#dc2626'
                        : `${INK}33`,
                    }}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor = showEmailError ? '#dc2626' : BLUE)
                    }
                    onBlurCapture={(e) =>
                      (e.currentTarget.style.borderColor = showEmailError ? '#dc2626' : `${INK}33`)
                    }
                  />
                </div>
                {showEmailError && (
                  <span className="block mt-1 text-xs" style={{ color: '#dc2626' }}>
                    Enter a valid email address (e.g. you@nadma.gov.my).
                  </span>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold mb-1.5">Password</label>
                <div className="relative">
                  <Lock
                    className="absolute left-0 top-1/2 -translate-y-1/2"
                    size={17}
                    style={{ color: `${INK}66` }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    className="w-full pl-7 pr-8 py-2 bg-transparent border-b text-sm focus:outline-none transition-colors"
                    style={{ borderColor: `${INK}33` }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = BLUE)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = `${INK}33`)}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-1 opacity-50 hover:opacity-80 transition-opacity"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !email || !emailValid || !password}
                className="w-full mt-2 py-3.5 text-sm font-semibold rounded flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
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
                    Sign in to Command Centre
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right: Live Monitoring Graphic */}
        <div
          className="relative hidden lg:flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: INK }}
        >
          <div
            className="absolute w-72 h-72 rounded-full opacity-30 blur-3xl"
            style={{
              backgroundColor: BLUE,
              animation: prefersReducedMotion ? 'none' : 'drift 10s ease-in-out infinite',
            }}
          />
          <div className="relative" style={{ width: 300, height: 300 }}>
            <svg viewBox="0 0 100 100" className="absolute inset-0">
              {[16, 30, 44].map((r) => (
                <circle
                  key={r}
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  stroke={`${BLUE}44`}
                  strokeWidth="0.5"
                />
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
              <span className="text-base font-semibold" style={{ color: PAPER }}>
                EOC System Status
              </span>
              <span
                className="text-sm flex items-center gap-1 mt-1"
                style={{ color: BLUE }}
              >
                <Activity size={13} /> Active Operational Readiness
              </span>
              <span className="text-xs mt-3" style={{ color: `${PAPER}66` }}>
                Multi-agency synchronization online
              </span>
            </div>
          </div>
        </div>
      </main>

      <footer
        className="font-ui border-t py-4 px-6 text-center text-sm"
        style={{ borderColor: `${INK}1a`, color: `${INK}80` }}
      >
        NADMA Malaysia <span>&copy;</span> Vanguard Disaster Operations Centre
      </footer>
    </div>
  );
};

export default LoginPage;
