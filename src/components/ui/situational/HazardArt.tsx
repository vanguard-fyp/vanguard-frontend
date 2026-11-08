import React, { useState } from 'react';
import {
  AlertTriangle, Activity, CloudFog, CloudLightning, Flame, Image as ImageIcon, Mountain, Waves, Wind, type LucideIcon,
} from 'lucide-react';

/* ============================================================
   Web counterpart of the mobile app's HazardArt: navy artwork for
   a hazard where there is no photo, with a faint tint and a
   decoration that belongs to the hazard, plus its icon.
   ============================================================ */

type Kind = 'flood' | 'flash' | 'landslide' | 'haze' | 'fire' | 'storm' | 'wind' | 'quake' | 'other';

const kindOf = (hazard: string): Kind => {
  const h = hazard.toLowerCase();
  if (h.includes('flood')) return h.includes('flash') ? 'flash' : 'flood';
  if (h.includes('landslide')) return 'landslide';
  if (h.includes('haze') || h.includes('smoke')) return 'haze';
  if (h.includes('fire')) return 'fire';
  if (h.includes('thunder') || h.includes('storm') || h.includes('lightning')) return 'storm';
  if (h.includes('wind') || h.includes('cyclone')) return 'wind';
  if (h.includes('earthquake') || h.includes('quake')) return 'quake';
  return 'other';
};

const LOOK: Record<Kind, { tint: string; Icon: LucideIcon }> = {
  flood: { tint: '#3d7bd9', Icon: Waves },
  flash: { tint: '#3d7bd9', Icon: Waves },
  landslide: { tint: '#8a6a3d', Icon: Mountain },
  haze: { tint: '#8a93a6', Icon: CloudFog },
  fire: { tint: '#c0563e', Icon: Flame },
  storm: { tint: '#5b5fc7', Icon: CloudLightning },
  wind: { tint: '#3f9aa8', Icon: Wind },
  quake: { tint: '#9a7a4f', Icon: Activity },
  other: { tint: '#3d7bd9', Icon: AlertTriangle },
};

const FILL = 'rgba(255,255,255,.10)';
const LINE = { stroke: 'rgba(255,255,255,.14)', strokeWidth: 2, strokeLinecap: 'round' as const, fill: 'none' };

const Waves2: React.FC<{ top: number }> = ({ top }) => (
  <>
    {[0, 1].map((k) => (
      <path key={k} fill={FILL}
        d={`M0 ${top + k * 16} C 40 ${top + k * 16 - 12}, 80 ${top + k * 16 + 12}, 120 ${top + k * 16} S 200 ${top + k * 16 - 12}, 240 ${top + k * 16} V160 H0 Z`} />
    ))}
  </>
);

const Rain: React.FC<{ n: number }> = ({ n }) => (
  <>
    {Array.from({ length: n }, (_, i) => {
      const x = (i * 37 + 14) % 240;
      const y = (i * 23) % 70;
      return <line key={i} x1={x} y1={y} x2={x - 6} y2={y + 14} {...LINE} />;
    })}
  </>
);

const Decoration: React.FC<{ kind: Kind }> = ({ kind }) => {
  switch (kind) {
    case 'flood':
      return <Waves2 top={104} />;
    case 'flash':
      return <><Rain n={8} /><Waves2 top={112} /></>;
    case 'landslide':
      return (
        <>
          <path d="M0 70 L240 160 H0 Z" fill={FILL} />
          {[[130, 128, 6], [170, 142, 5], [92, 116, 4]].map(([cx, cy, r]) => <circle key={cx} cx={cx} cy={cy} r={r} fill={FILL} />)}
        </>
      );
    case 'haze':
      return (
        <>
          {[0, 1, 2, 3].map((k) => (
            <rect key={k} x={k % 2 ? 60 : -20} y={34 + k * 32} width={200} height={10} rx={5} fill={FILL} />
          ))}
        </>
      );
    case 'fire':
      return (
        <>
          {Array.from({ length: 12 }, (_, i) => (
            <circle key={i} cx={(i * 41 + 12) % 240} cy={154 - (i * 29) % 126} r={2 + (i % 3)} fill={FILL} />
          ))}
        </>
      );
    case 'storm':
      return <><Rain n={8} /><path d="M192 10 L168 48 L188 48 L164 84" {...LINE} strokeWidth={3} /></>;
    case 'wind':
      return (
        <>
          {[40, 80, 120].map((y) => (
            <path key={y} d={`M-4 ${y} C 70 ${y - 14}, 140 ${y + 14}, 204 ${y} a 8 8 0 1 0 -8 -8`} {...LINE} />
          ))}
        </>
      );
    case 'quake':
      return <path d="M30 0 L66 28 L34 54 L78 82 L44 108 L88 134 L60 160" {...LINE} strokeWidth={3} />;
    default:
      return <>{[40, 66].map((r) => <circle key={r} cx={120} cy={80} r={r} {...LINE} />)}</>;
  }
};

export const HazardArt: React.FC<{ hazard: string; iconSize?: number }> = ({ hazard, iconSize = 30 }) => {
  const kind = kindOf(hazard);
  const { tint, Icon } = LOOK[kind];
  return (
    <div className="absolute inset-0 flex items-center justify-center"
      style={{ background: `linear-gradient(135deg, color-mix(in srgb, #1e293b 90%, ${tint}), color-mix(in srgb, #2b3b57 82%, ${tint}))` }}>
      <svg viewBox="0 0 240 160" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full" aria-hidden="true">
        <Decoration kind={kind} />
      </svg>
      <Icon size={iconSize} strokeWidth={1.75} className="relative text-white -translate-x-3" aria-hidden="true" />
    </div>
  );
};

/**
 * Left half of a card: the photo (or hazard art when there is none, or it
 * fails to load), leaning into the content beside it on a curved slash.
 */
export const SlashMedia: React.FC<{
  hazard: string;
  photo?: string;
  /** how many photos the record has, shown when there are more than one */
  count?: number;
  alt?: string;
  /** colour of the card behind the content, which the curve is cut from */
  surface?: string;
  className?: string;
}> = ({ hazard, photo, count = 0, alt = '', surface = '#ffffff', className = 'w-[40%]' }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative shrink-0 overflow-hidden ${className}`}>
      {photo && !failed
        ? <img src={photo} alt={alt} loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 w-full h-full object-cover" />
        : <HazardArt hazard={hazard} />}
      {count > 1 && !failed && (
        <span className="absolute left-2 bottom-2 inline-flex items-center gap-1 rounded-md bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-semibold text-white tabular-nums">
          <ImageIcon size={10} aria-hidden="true" />{count}
        </span>
      )}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-y-0 right-0 h-full w-12" aria-hidden="true">
        <path d="M100 0 C 96 46, 56 80, 0 100 L100 100 Z" fill={surface} />
      </svg>
    </div>
  );
};
