import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, LayoutDashboard, LockKeyhole, RefreshCw, ShieldAlert, WifiOff } from 'lucide-react';
import { PublicHeader } from '../../components/public/PublicChrome';
import { useAuth } from '../../context/AuthContext';
import { WEB_ADMIN_ROLES } from '../../services/authService';

type Reason = 'unavailable' | 'denied' | 'signin';

const COPY: Record<Reason, { title: string; body: string }> = {
  signin: { title: 'Unauthorized', body: 'Please sign in to continue.' },
  denied: { title: 'Access denied', body: "Your account can't open this page." },
  unavailable: { title: 'Server unavailable', body: "We couldn't verify your session." },
};

function AnimatedLock() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <g className="lf-lock__shackle-hover">
        <path className="lf-lock__shackle" d="M7 11V7a5 5 0 0 1 10 0v4" />
      </g>
      <rect x="3" y="11" width="18" height="11" rx="2.5" />
      <circle className="lf-lock__keyhole" cx="12" cy="16.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function UnauthorizedPage({ unavailable = false, onRetry }: { unavailable?: boolean; onRetry?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const reason: Reason = unavailable ? 'unavailable' : location.state?.denied ? 'denied' : 'signin';
  const { title, body } = COPY[reason];
  const isOfficer = Boolean(user && WEB_ADMIN_ROLES.has(user.role));
  const Icon = reason === 'unavailable' ? WifiOff : reason === 'denied' ? ShieldAlert : LockKeyhole;

  const signInAgain = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="lf lf-auth">
      <PublicHeader variant="minimal" />

      <main className="lf-status" role={reason === 'unavailable' ? 'alert' : undefined}>
        <span
          className={`lf-status__mark lf-status__mark--${reason}${reason === 'signin' ? '' : ' lf-status__mark--alarm'}`}
          aria-hidden="true"
        >
          {reason === 'signin' ? <AnimatedLock /> : <Icon size={24} className="lf-status__icon" />}
        </span>
        <h1 className="lf-display lf-status__title">{title}</h1>
        <p className="lf-small lf-status__body">{body}</p>

        {reason === 'unavailable' && onRetry && (
          <button type="button" onClick={onRetry} className="lf-btn lf-btn--spot">
            <RefreshCw size={16} aria-hidden="true" /> Retry
          </button>
        )}
        {reason === 'signin' && (
          <Link to="/login" className="lf-btn lf-btn--spot">
            Sign in <ArrowRight size={16} className="lf-nudge" aria-hidden="true" />
          </Link>
        )}
        {reason === 'denied' && (isOfficer ? (
          <Link to="/dashboard" className="lf-btn lf-btn--spot">
            <LayoutDashboard size={16} aria-hidden="true" /> Back to dashboard
          </Link>
        ) : (
          <button type="button" onClick={() => void signInAgain()} className="lf-btn lf-btn--spot">
            Sign in <ArrowRight size={16} className="lf-nudge" aria-hidden="true" />
          </button>
        ))}
      </main>
    </div>
  );
}
