import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Lock, PhoneCall, ArrowRight, Activity, Radar, ShieldCheck, Radio, Truck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BLUE, INK, PAPER } from '../../constants/theme';

const HEADLINE = "One command post for every agency in the field.";

const BLIPS = [
  { x: 62, y: 30 }, { x: 30, y: 55 }, { x: 75, y: 68 }, { x: 45, y: 80 },
];

const DIRECTIVES = [
  { code: 'NADMA-DIR-20', title: 'Activation Framework No. 20', updated: 'August 2026', detail: 'Sets the trigger conditions for District, State, and Federal level activation, and who holds command at each stage.' },
  { code: 'JBPM-SAR-04', title: 'Flood SAR Deployment Manual', updated: 'July 2026', detail: 'Boat squad staging standards, swift-water extraction procedure, and helipad ground safety checks.' },
  { code: 'JKM-PPS-09', title: 'Relief Center Guidelines', updated: 'June 2026', detail: 'Shelter capacity limits, priority triage for elderly and infants, and food distribution standards.' },
];

const PIPELINE = [
  { icon: Radar, title: 'Detect', text: 'River gauges and field reports flag a threshold breach the moment it happens.' },
  { icon: ShieldCheck, title: 'Verify', text: 'A duty officer confirms severity and assigns the activation level.' },
  { icon: Radio, title: 'Deploy', text: 'SAR squads and boat crews are dispatched with live routing to the site.' },
  { icon: Truck, title: 'Relief', text: 'Shelters open and supply convoys are tracked until the sector clears.' },
];

const RadarPanel: React.FC<{ size?: number; reduced?: boolean }> = ({ size = 220, reduced }) => (
  <div className="relative" style={{ width: size, height: size }}>
    <svg viewBox="0 0 100 100" className="absolute inset-0">
      {[18, 32, 46].map((r) => (
        <circle key={r} cx="50" cy="50" r={r} fill="none" stroke={`${BLUE}33`} strokeWidth="0.6" />
      ))}
      {!reduced && (
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '50px 50px', transformBox: 'view-box' }}
        >
          <path d="M50 50 L50 6 A46 46 0 0 1 88 28 Z" fill={`${BLUE}22`} />
        </motion.g>
      )}
      {BLIPS.map((b, i) => (
        <motion.circle
          key={i}
          cx={b.x}
          cy={b.y}
          r="2.2"
          fill={BLUE}
          animate={reduced ? {} : { opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
        />
      ))}
    </svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
      <span className="font-ui text-xs font-semibold" style={{ color: INK }}>Live monitoring</span>
      <span className="font-ui text-xs flex items-center gap-1 mt-1" style={{ color: BLUE }}>
        <Activity size={13} /> 4 sectors tracked
      </span>
    </div>
  </div>
);

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [openDirective, setOpenDirective] = useState<number | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const words = HEADLINE.split(' ');

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: PAPER, color: INK }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,500;0,600;1,500&family=Public+Sans:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Newsreader', serif; }
        .font-ui { font-family: 'Public Sans', sans-serif; }
        .book-page { backface-visibility: hidden; }
      `}</style>

      <header className="font-ui sticky top-0 z-40 border-b" style={{ backgroundColor: PAPER, borderColor: `${INK}1a` }}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-xl font-semibold">Vanguard</span>
            <span className="text-sm" style={{ color: `${INK}99` }}>Disaster Operations Intranet</span>
          </div>
          {isAuthenticated ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm font-semibold px-4 py-2 rounded-sm transition-opacity hover:opacity-85"
              style={{ backgroundColor: BLUE, color: '#fff' }}
            >
              Continue to dashboard, {user?.role?.split(' ')[0]}
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-semibold flex items-center gap-1.5 px-4 py-2 rounded-sm border transition-opacity hover:opacity-70"
              style={{ borderColor: INK, color: INK }}
            >
              <Lock size={14} /> Operator sign in
            </button>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <motion.h1
              className="font-display text-[2.4rem] sm:text-[3.4rem] leading-[1.08] font-medium max-w-2xl"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: prefersReducedMotion ? 0 : 0.06 } } }}
            >
              {words.map((w, i) => (
                <motion.span
                  key={i}
                  className="inline-block mr-[0.28em]"
                  variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } }}
                >
                  {w}
                </motion.span>
              ))}
            </motion.h1>

            <motion.p
              className="font-ui text-base leading-relaxed max-w-md mt-6"
              style={{ color: `${INK}b3` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: prefersReducedMotion ? 0 : 0.55, duration: 0.5 }}
            >
              Incident tracking, rescue dispatch, and relief logistics for NADMA, APM, JBPM and JPS,
              read from the same live record.
            </motion.p>

            <motion.div
              className="flex flex-wrap items-center gap-3 mt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: prefersReducedMotion ? 0 : 0.75, duration: 0.5 }}
            >
              <button
                onClick={() => navigate('/login')}
                className="font-ui text-sm font-semibold px-5 py-3 rounded-sm flex items-center gap-2 transition-opacity hover:opacity-90"
                style={{ backgroundColor: BLUE, color: '#fff' }}
              >
                Enter command dashboard
                <ArrowRight size={15} />
              </button>
              <button
                onClick={() => navigate('/situational/incidents')}
                className="font-ui text-sm font-semibold px-5 py-3 rounded-sm border transition-opacity hover:opacity-70"
                style={{ borderColor: `${INK}66`, color: INK }}
              >
                File a hazard report
              </button>
            </motion.div>
          </div>

          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, duration: 0.6 }}>
              <RadarPanel reduced={!!prefersReducedMotion} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Directives */}
      <section className="max-w-5xl mx-auto px-6 py-14 border-t" style={{ borderColor: `${INK}1a` }}>
        <h2 className="font-display text-xl mb-1">Command directives</h2>
        <p className="font-ui text-sm mb-7" style={{ color: `${INK}99` }}>Open a folder to read the brief.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5" style={{ perspective: '1400px' }}>
          {DIRECTIVES.map((d, i) => {
            const isOpen = openDirective === i;
            return (
              <div key={d.code} className="relative h-56">
                <div className="font-ui absolute inset-0 rounded-sm border p-4 flex flex-col justify-between" style={{ borderColor: `${INK}26`, backgroundColor: `${INK}06` }}>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: BLUE }}>{d.code}</p>
                    <p className="text-sm font-semibold mt-2 leading-snug">{d.title}</p>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: `${INK}b3` }}>{d.detail}</p>
                </div>

                <motion.button
                  onClick={() => setOpenDirective(isOpen ? null : i)}
                  className="book-page font-ui absolute inset-0 rounded-sm border p-4 flex flex-col justify-between text-left cursor-pointer"
                  style={{ backgroundColor: INK, color: PAPER, borderColor: INK, transformOrigin: 'left center' }}
                  animate={{ rotateY: isOpen ? -132 : 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.55, ease: [0.65, 0, 0.35, 1] }}
                >
                  <div>
                    <p className="text-xs" style={{ color: `${PAPER}80` }}>Updated {d.updated}</p>
                    <p className="font-display text-lg mt-3 leading-snug">{d.title}</p>
                  </div>
                  <p className="text-sm" style={{ color: `${PAPER}99` }}>{isOpen ? 'Tap to close' : 'Tap to open'}</p>
                </motion.button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Response pipeline */}
      <section className="max-w-5xl mx-auto px-6 py-16 border-t" style={{ borderColor: `${INK}1a` }}>
        <h2 className="font-display text-xl mb-1">How a response unfolds</h2>
        <p className="font-ui text-sm mb-10" style={{ color: `${INK}99` }}>From first signal to relief on the ground.</p>

        <div className="relative">
          <div className="hidden sm:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2" style={{ backgroundColor: `${INK}1a` }} />
          <div className="space-y-10 sm:space-y-4">
            {PIPELINE.map((step, i) => {
              const fromLeft = i % 2 === 0;
              const Icon = step.icon;
              return (
                <div key={step.title} className="sm:grid sm:grid-cols-2 sm:gap-10 sm:items-center">
                  <motion.div
                    initial={{ opacity: 0, x: fromLeft ? -70 : 70 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className={`font-ui rounded-sm border p-5 ${fromLeft ? 'sm:col-start-1' : 'sm:col-start-2'}`}
                    style={{ borderColor: `${INK}26`, backgroundColor: `${INK}05` }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${BLUE}1a` }}>
                        <Icon size={16} style={{ color: BLUE }} />
                      </div>
                      <p className="text-base font-semibold">{step.title}</p>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: `${INK}99` }}>{step.text}</p>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Hotlines */}
      <section className="border-t" style={{ borderColor: `${INK}1a` }}>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <h2 className="font-display text-xl mb-5 flex items-center gap-2">
            <PhoneCall size={18} style={{ color: BLUE }} />
            Emergency hotlines
          </h2>
          <div className="font-ui divide-y" style={{ borderColor: `${INK}14` }}>
            {[
              { agency: 'Emergency Response', number: '999', role: 'Police, fire, medical' },
              { agency: 'NADMA Command Center', number: '03-8064 2400', role: 'National disaster command' },
              { agency: 'Talian Kasih', number: '15999', role: 'Welfare and relief support' },
            ].map((h) => (
              <div key={h.agency} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold">{h.agency}</p>
                  <p className="text-sm" style={{ color: `${INK}80` }}>{h.role}</p>
                </div>
                <p className="text-base font-semibold" style={{ color: BLUE }}>{h.number}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="font-ui border-t py-5" style={{ borderColor: `${INK}1a` }}>
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between text-sm" style={{ color: `${INK}80` }}>
          <span>NADMA Malaysia — Vanguard Disaster Operations Center</span>
          <Link to="/login" style={{ color: INK }} className="font-semibold hover:opacity-70">Operator sign in →</Link>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;