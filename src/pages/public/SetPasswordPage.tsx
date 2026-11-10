import React, { useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { PublicHeader } from '../../components/public/PublicChrome';
import { MonitoringPlate, useSceneCycle } from '../../components/public/MonitoringPlate';
import { authService } from '../../services/authService';

const MIN_LENGTH = 8;

/**
 * Read the invite link once. Supabase sends the officer here with the session
 * in the URL fragment (#access_token=…&type=invite), or an error if the link
 * has expired. The fragment is removed straight away so the token does not
 * stay in the address bar or browser history.
 */
const readInvite = (): { token: string | null; error: string | null } => {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  if (window.location.hash) {
    window.history.replaceState(null, '', window.location.pathname);
  }
  const error = params.get('error_description');
  return {
    token: params.get('access_token'),
    error: error ? error.replace(/\+/g, ' ') : null,
  };
};

export const SetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [invite] = useState(readInvite);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(
    invite.error
      ? `${invite.error}. Ask your administrator to resend the invite.`
      : !invite.token
        ? 'Open this page from the invite link in your email.'
        : null,
  );
  const reduced = !!useReducedMotion();
  const scene = useSceneCycle(reduced);

  const tooShort = password.length > 0 && password.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = !!invite.token && password.length >= MIN_LENGTH && confirm === password && !busy;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !invite.token) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await authService.setPassword(invite.token, password);
      navigate('/login', { replace: true, state: { email: res.email, notice: 'Password set. Sign in to continue.' } });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setErrorMsg(typeof detail === 'string' ? detail : err?.message || 'Your password could not be saved. Try again.');
      setBusy(false);
    }
  };

  return (
    <div className="lf lf-auth">
      <PublicHeader variant="auth" />

      <main className="lf-auth__main">
        <div className="lf-auth__formcol">
          <div className="lf-auth__form">
            <h1 className="lf-display" style={{ fontSize: 'clamp(2rem, 3.2vw, 2.6rem)', margin: 0 }}>
              Set your password
            </h1>
            <p className="lf-small" style={{ margin: '0.75rem 0 2rem', fontSize: '1rem' }}>
              Your administrator created your Vanguard account. Choose a password to finish setting it up.
            </p>

            {errorMsg && (
              <div className="lf-alert" role="alert">
                <AlertCircle size={18} className="shrink-0" style={{ marginTop: 1 }} aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            {invite.token ? (
              <form onSubmit={handleSubmit} noValidate aria-busy={busy}>
                <div className="lf-field">
                  <label htmlFor="new-password" className="lf-label">New password</label>
                  <div className="lf-input-wrap">
                    <LockKeyhole size={17} className="lf-input__icon" aria-hidden="true" />
                    <input
                      id="new-password"
                      type={show ? 'text' : 'password'}
                      className="lf-input lf-input--pw"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={busy}
                      aria-invalid={tooShort}
                      aria-describedby="new-password-hint"
                    />
                    <button
                      type="button"
                      className="lf-reveal"
                      onClick={() => setShow((v) => !v)}
                      aria-pressed={show}
                      aria-label={show ? 'Hide password' : 'Show password'}
                    >
                      {show ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                    </button>
                  </div>
                  <span id="new-password-hint" className={tooShort ? 'lf-field__msg' : 'lf-field__hint'}>
                    At least {MIN_LENGTH} characters.
                  </span>
                </div>

                <div className="lf-field">
                  <label htmlFor="confirm-password" className="lf-label">Confirm password</label>
                  <div className="lf-input-wrap">
                    <LockKeyhole size={17} className="lf-input__icon" aria-hidden="true" />
                    <input
                      id="confirm-password"
                      type={show ? 'text' : 'password'}
                      className="lf-input"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      disabled={busy}
                      aria-invalid={mismatch}
                      aria-describedby={mismatch ? 'confirm-password-error' : undefined}
                    />
                  </div>
                  {mismatch && (
                    <span id="confirm-password-error" className="lf-field__msg">
                      <AlertCircle size={14} style={{ marginTop: 2 }} aria-hidden="true" />
                      The passwords do not match.
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  className={`lf-btn lf-btn--spot${busy ? ' is-busy' : ''}`}
                  style={{ width: '100%', marginTop: '2rem', minHeight: '3.375rem' }}
                  disabled={!canSubmit}
                >
                  {busy ? (
                    <>
                      <span className="lf-spinner" aria-hidden="true" />
                      Saving…
                    </>
                  ) : (
                    <>
                      Set password
                      <ArrowRight size={16} className="lf-nudge" aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <Link to="/login" className="lf-btn lf-btn--spot" style={{ width: '100%', minHeight: '3.375rem' }}>
                Go to sign in
              </Link>
            )}
          </div>
        </div>

        <div className="lf-auth__plate" aria-hidden="true">
          <MonitoringPlate scene={scene} still={reduced} />
        </div>
      </main>
    </div>
  );
};

export default SetPasswordPage;
