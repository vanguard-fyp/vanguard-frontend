import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { NADMA_OFFICE, SOURCE_CHECKED } from '../../pages/public/publicContent';
import './public.css';

export const PROTOTYPE_NOTE =
  'Vanguard is a final-year project prototype. It is not an official government service.';

export const Wordmark: React.FC = () => (
  <Link to="/" className="lf-wordmark" aria-label="Vanguard, public site home">
    <span className="lf-wordmark__name">Vanguard</span>
    <span className="lf-wordmark__org">for NADMA Malaysia</span>
  </Link>
);

interface HeaderProps { variant?: 'landing' | 'auth' | 'minimal' }

export const PublicHeader: React.FC<HeaderProps> = ({ variant = 'landing' }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <header className="lf-header" data-scrolled={scrolled}>
      <div className="lf-wrap lf-header__row">
        <Wordmark />
        {variant !== 'minimal' && (
          <nav className="lf-nav" aria-label="Public site">
            {variant === 'auth' && <Link to="/" className="lf-nav__back">Back to public site</Link>}
          </nav>
        )}
      </div>
    </header>
  );
};

export const PublicFooter: React.FC = () => (
  <footer className="lf-footer">
    <div className="lf-wrap">
      <div className="lf-footer__grid">
        <div>
          <p className="lf-wordmark__name" style={{ color: '#fff', margin: '0 0 0.5rem' }}>Vanguard</p>
          <p style={{ margin: 0, maxWidth: '44ch' }}>
            A multi-agency disaster operations platform built around the work of{' '}
            {NADMA_OFFICE.name}, {NADMA_OFFICE.parent}.
          </p>
          <p style={{ margin: '1rem 0 0', maxWidth: '52ch' }}>{PROTOTYPE_NOTE}</p>
        </div>
        <div>
          <h4>On this page</h4>
          <ul>
            <li><a href="/#about">About the platform</a></li>
            <li><a href="/#resources">Resources</a></li>
            <li><a href="/#history">History</a></li>
            <li><a href="/#help">Contacts</a></li>
            <li><Link to="/login">Operator sign in</Link></li>
          </ul>
        </div>
        <div>
          <h4>NADMA headquarters</h4>
          <ul>
            <li><a href={`tel:${NADMA_OFFICE.phone.dial}`} className="tnum">{NADMA_OFFICE.phone.label}</a></li>
            <li><a href={NADMA_OFFICE.website.href} target="_blank" rel="noreferrer">{NADMA_OFFICE.website.label}</a></li>
            <li>Putrajaya, Malaysia</li>
          </ul>
        </div>
      </div>
      <div className="lf-footer__base">
        <span>Agency details and documents are linked from their official publishers, checked {SOURCE_CHECKED}.</span>
        <span>© 2026 Vanguard</span>
      </div>
    </div>
  </footer>
);
