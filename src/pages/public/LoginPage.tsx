import React, { useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, AlertCircle, Eye, EyeOff, Mail, LockKeyhole } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PublicHeader } from '../../components/public/PublicChrome';
import { MonitoringPlate, useSceneCycle } from '../../components/public/MonitoringPlate';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [capsOn, setCapsOn] = useState(false);
  const reduced = !!useReducedMotion();
  const scene = useSceneCycle(reduced);

  const checkCaps = (e: React.KeyboardEvent<HTMLInputElement>) => setCapsOn(e.getModifierState?.('CapsLock') ?? false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const showEmailError = emailTouched && email.length > 0 && !emailValid;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const unreachable =
        !detail && (err instanceof TypeError || /failed to fetch|network/i.test(err?.message ?? ''));
      setErrorMsg(
        typeof detail === 'string'
          ? detail
          : unreachable
            ? "We couldn't reach the Vanguard server. Check your connection and try again."
            : err?.message || 'Sign-in failed. Check your email and password and try again.',
      );
    }
  };

  return (
    <div className="lf lf-auth">
      <PublicHeader variant="auth" />

      <main className="lf-auth__main">
        <div className="lf-auth__formcol">
          <div className="lf-auth__form">
            <h1 className="lf-display" style={{ fontSize: 'clamp(2rem, 3.2vw, 2.6rem)', margin: 0 }}>
              Operator sign in
            </h1>
            <p className="lf-small" style={{ margin: '0.75rem 0 2rem', fontSize: '1rem' }}>
              Use the email and password issued with your agency account.
            </p>

            {errorMsg && (
              <div className="lf-alert" role="alert">
                <AlertCircle size={18} className="shrink-0" style={{ marginTop: 1 }} aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} noValidate aria-busy={isLoading}>
              <div className="lf-field">
                <label htmlFor="login-email" className="lf-label">Agency email</label>
                <div className="lf-input-wrap">
                <Mail size={17} className="lf-input__icon" aria-hidden="true" />
                <input
                  id="login-email"
                  type="email"
                  className="lf-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  autoComplete="username"
                  inputMode="email"
                  spellCheck={false}
                  placeholder="name@nadma.gov.my"
                  disabled={isLoading}
                  aria-invalid={showEmailError}
                  aria-describedby={showEmailError ? 'login-email-error' : undefined}
                />
                </div>
                {showEmailError && (
                  <span id="login-email-error" className="lf-field__msg">
                    <AlertCircle size={14} style={{ marginTop: 2 }} aria-hidden="true" />
                    Enter a full email address, for example name@nadma.gov.my.
                  </span>
                )}
              </div>

              <div className="lf-field">
                <label htmlFor="login-password" className="lf-label">Password</label>
                <div className="lf-input-wrap">
                  <LockKeyhole size={17} className="lf-input__icon" aria-hidden="true" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className="lf-input lf-input--pw"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={isLoading}
                    onKeyDown={checkCaps}
                    onKeyUp={checkCaps}
                    placeholder="********"
                    onBlur={() => setCapsOn(false)}
                    aria-describedby={capsOn ? 'login-caps' : undefined}
                  />
                  <button
                    type="button"
                    className="lf-reveal"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-pressed={showPassword}
                    aria-controls="login-password"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                  </button>
                </div>
                {capsOn && <span id="login-caps" className="lf-field__hint">Caps Lock is on.</span>}
              </div>

              <button
                type="submit"
                className={`lf-btn lf-btn--spot${isLoading ? ' is-busy' : ''}`}
                style={{ width: '100%', marginTop: '2rem', minHeight: '3.375rem' }}
                disabled={isLoading || !email || !emailValid || !password}
              >
                {isLoading ? (
                  <>
                    <span className="lf-spinner" aria-hidden="true" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight size={16} className="lf-nudge" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="lf-auth__plate" aria-hidden="true">
          <MonitoringPlate scene={scene} still={reduced} />
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
