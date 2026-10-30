import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Phone } from 'lucide-react';
import { PublicHeader, PublicFooter } from '../../components/public/PublicChrome';
import { MonitoringPlate, useSceneCycle } from '../../components/public/MonitoringPlate';
import { HalftoneField } from '../../components/public/HalftoneField';
import { PublicationFold } from '../../components/public/PublicationFold';
import { FlipBook } from '../../components/public/FlipBook';
import { ResourceShelf } from '../../components/public/ResourceShelf';
import { MilestoneTimeline } from '../../components/public/MilestoneTimeline';
import { RadarDock } from '../../components/public/RadarDock';
import { RadarRoamer } from '../../components/public/RadarRoamer';
import { Preloader } from '../../components/public/Preloader';
import {
  RESOURCE_GROUPS,
  PUBLICATIONS,
  MILESTONES,
  KEY_LINES,
  LIVE_CHANNELS,
  type Publication,
} from './publicContent';
import { useAuth } from '../../context/AuthContext';

/** Clamped linear map. A function transform keeps framer-motion from handing the
    value to a native ScrollTimeline, which proved unreliable for opacity here. */
const lerp = (v: number, a: number, b: number, from: number, to: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return from + (to - from) * t;
};

const useMedia = (query: string) => {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return match;
};

const SECTIONS = [
  { id: 'resources', label: 'Resources' },
  { id: 'publications', label: 'Publications' },
  { id: 'history', label: 'History' },
  { id: 'help', label: 'Contacts' },
];

const BOOKS = PUBLICATIONS.filter((p): p is Publication => p !== null);

export const LandingPage: React.FC = () => {
  const location = useLocation();
  const reduced = !!useReducedMotion();
  const wide = useMedia('(min-width: 900px)');
  const scene = useSceneCycle(reduced);

  const stage = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: stage, offset: ['start start', 'end end'] });
  const fieldOpacity = useTransform(scrollYProgress, (v) => lerp(v, 0.1, 0.36, 1, 0.22));

  useEffect(() => {
    if (!location.hash) return;
    const el = document.getElementById(location.hash.slice(1));
    if (!el) return;
    const id = window.setTimeout(() => el.scrollIntoView(), 60);
    return () => window.clearTimeout(id);
  }, [location.hash]);

    const { isAuthenticated } = useAuth();

  return (
    <div className="lf" id="top">
      <Preloader reduced={reduced} landOn={location.hash ? undefined : 'about'} onEnter={() => { }} />
      <a href="#about" className="sr-only focus:not-sr-only">Skip to content</a>
      <PublicHeader />
      <RadarDock sections={SECTIONS} />
      <RadarRoamer scene={scene} still={reduced} />

      <main>
        <div ref={stage} className="lf-stage" data-static={reduced}>
          <section id="about" className="lf-intro" aria-labelledby="about-title">
            <motion.div
              className="lf-stage__field"
              style={reduced ? undefined : { opacity: fieldOpacity }}
            >
              <HalftoneField still={reduced} className="lf-stage__field" />
            </motion.div>

            <div className="lf-wrap lf-intro__grid">
              <div className="lf-intro__head">
                <h2
                  id="about-title"
                  className="lf-display lf-intro__title"
                  style={{ margin: 0 }}
                >
                  Every agency, the same picture.
                </h2>

                <div className="lf-intro__body">
                  <p className="lf-lede" style={{ marginTop: 0 }}>
                    NADMA has coordinated disaster management in Malaysia since
                    1 October 2015. Vanguard gives NADMA and the responding
                    agencies one live operational record.
                  </p>
                </div>

                <div className="lf-intro__cta">
                {isAuthenticated ? (
                  <Link to="/dashboard" className="lf-btn lf-btn--spot">
                    Open dashboard <ArrowRight size={16} className="lf-nudge" aria-hidden="true" />
                  </Link>
                ) : (
                  <Link to="/login" className="lf-btn lf-btn--spot">Sign in <ArrowRight size={16} className="lf-nudge" aria-hidden="true" /></Link>
                )}
                </div>
              </div>


              <motion.div
                className="lf-stage__plate"
                data-radar-source
                style={{
                  opacity: 1,
                  scale: 1,
                  transformOrigin: 'center center',
                }}
              >
                <MonitoringPlate scene={scene} still={reduced} />
              </motion.div>

            </div>
          </section>
        </div>

        <section id="resources" className="lf-section lf-section--field" aria-labelledby="resources-title">
          <HalftoneField still={reduced} className="lf-section__field" />
          <div className="lf-wrap">
            <div className="lf-section__head">
              <h2 id="resources-title" className="lf-h2">When a warning lands, officers reach for the rules.</h2>
            </div>
            <ResourceShelf groups={RESOURCE_GROUPS} reduced={reduced} />
          </div>
        </section>

        <section id="publications" className="lf-section lf-section--deep lf-section--pinned" aria-labelledby="publications-title">
          <h2 id="publications-title" className="sr-only">Reference shelf: six frameworks behind every decision</h2>
          {wide && !reduced ? <FlipBook items={BOOKS} /> : <PublicationFold items={PUBLICATIONS} reduced={reduced} />}
        </section>

        <section id="history" className="lf-section lf-section--pinned" aria-labelledby="history-title">
          <div className="lf-wrap">
            <div className="lf-section__head lf-section__head--tight">
              <h2 id="history-title" className="lf-h2">Every rule was written after a hard lesson.</h2>
            </div>
          </div>
          <MilestoneTimeline items={MILESTONES} reduced={reduced} />
        </section>

        <section id="help" className="lf-section" aria-labelledby="help-title">
          <div className="lf-wrap">
            <div className="lf-section__head">
              <h2 id="help-title" className="lf-h2">When it can't wait, call.</h2>

            </div>

            <ul className="lf-keylines">
              {KEY_LINES.map((h, i) => (
                <li key={h.number} data-primary={i === 0}>
                  <a href={`tel:${h.dial}`}>
                    <span className="lf-keylines__name">{h.name}</span>
                    <span className="lf-keylines__num tnum">{h.number}</span>
                    <span className="lf-keylines__detail">{h.detail}</span>
                    <span className="lf-keylines__call"><Phone size={14} aria-hidden="true" /> Call</span>
                  </a>
                </li>
              ))}
            </ul>

            <p className="lf-channels-row">
              <span className="lf-label">Official live updates</span>
              {LIVE_CHANNELS.slice(0, 3).map((c) => (
                <a key={c.name} className="lf-link" href={c.href} target="_blank" rel="noreferrer">
                  {c.name} <ArrowUpRight size={14} aria-hidden="true" />
                </a>
              ))}
            </p>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
};

export default LandingPage;
