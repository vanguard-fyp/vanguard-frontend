import React from 'react';
import { Landmark, PhoneCall, Radio, RadioTower, ShieldCheck, Users, type LucideIcon } from 'lucide-react';

/* ============================================================
   Tags in the operations app. Two looks, so a card never turns into
   a row of coloured pills:
   - soft: hue text on an 8% wash of itself. Only for the one signal
     that asks for action (severity, GDACS alert level).
   - outline: white chip, slate text, the hue only in its dot or icon.
     For context (status, disaster level, source, hazard type).
   ============================================================ */

export const TONE = {
  red: '#dc2626',
  orange: '#ea580c',
  amber: '#d97706',
  blue: '#2563eb',
  cyan: '#0891b2',
  teal: '#0d9488',
  indigo: '#4f46e5',
  slate: '#64748b',
} as const;
export type Tone = keyof typeof TONE;

/** Text on a soft tag: one step darker than the hue, so it reads as ink, not neon. */
const TONE_INK: Record<Tone, string> = {
  red: '#b91c1c',
  orange: '#c2410c',
  amber: '#b45309',
  blue: '#1d4ed8',
  cyan: '#0e7490',
  teal: '#0f766e',
  indigo: '#4338ca',
  slate: '#475569',
};

export const SEVERITY_TONE: Record<string, Tone> = { Critical: 'red', High: 'orange', Medium: 'amber', Low: 'slate' };
export const STATUS_TONE: Record<string, Tone> = {
  Unverified: 'amber',
  Verified: 'blue',
  Responding: 'cyan',
  Resolved: 'teal',
  Rejected: 'slate',
  Archived: 'slate',
};
export const ALERT_TONE: Record<string, Tone> = { Red: 'red', Orange: 'orange', Green: 'teal' };

interface TagProps {
  tone?: Tone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
  title?: string;
  variant?: 'soft' | 'outline';
}

export const Tag: React.FC<TagProps> = ({ tone = 'slate', children, dot = true, className = '', title, variant = 'soft' }) => {
  const c = TONE[tone];
  if (variant === 'outline') {
    return (
      <span title={title}
        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-[3px] text-[11px] font-medium whitespace-nowrap text-slate-600 bg-white border border-slate-200 ${className}`}>
        {dot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c }} />}
        {children}
      </span>
    );
  }
  return (
    <span title={title}
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-[3px] text-[11px] font-semibold whitespace-nowrap ${className}`}
      style={{ color: TONE_INK[tone], background: `${c}12`, boxShadow: `inset 0 0 0 1px ${c}26` }}>
      {dot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c }} />}
      {children}
    </span>
  );
};

/** Workflow status: outline chip, the state in its dot. */
export const StatusTag: React.FC<{ status: string }> = ({ status }) => (
  <Tag variant="outline" tone={STATUS_TONE[status] ?? 'slate'}>{status}</Tag>
);

/** Activation tier: the higher the tier, the deeper the hue (red stays for severity). */
export const LEVEL_LOOK: Record<string, { tone: Tone; short: string; name: string }> = {
  'Level 1: District': { tone: 'slate', short: 'L1', name: 'District' },
  'Level 2: State': { tone: 'blue', short: 'L2', name: 'State' },
  'Level 3: Federal': { tone: 'indigo', short: 'L3', name: 'Federal' },
};

export const LevelTag: React.FC<{ level: string }> = ({ level }) => {
  const look = LEVEL_LOOK[level] ?? { tone: 'slate' as Tone, short: '', name: level };
  return (
    <Tag variant="outline" tone={look.tone} dot={false} title={level}>
      <Landmark size={12} strokeWidth={2} aria-hidden="true" style={{ color: TONE[look.tone] }} />
      {look.short ? `${look.short} · ${look.name}` : look.name}
    </Tag>
  );
};

/** Where a report came from, grouped into a few kinds the officer can read at a glance. */
export const sourceLook = (source?: string | null): { tone: Tone; Icon: LucideIcon; kind: string } => {
  const s = (source ?? '').toLowerCase();
  if (/sensor|jps|telemetr|meteo|hydro|gauge|satellite/.test(s)) return { tone: 'blue', Icon: RadioTower, kind: 'Sensor' };
  if (/999|sos|mers|hotline|emergency call/.test(s)) return { tone: 'amber', Icon: PhoneCall, kind: 'Emergency call' };
  if (/citizen|public|app|resident/.test(s)) return { tone: 'cyan', Icon: Users, kind: 'Citizen' };
  if (/agency|patrol|police|pdrm|bomba|apm|atm|officer|nadma/.test(s)) return { tone: 'indigo', Icon: ShieldCheck, kind: 'Agency' };
  return { tone: 'slate', Icon: Radio, kind: 'Other' };
};

export const SourceTag: React.FC<{ source?: string | null; reporter?: string | null }> = ({ source, reporter }) => {
  const { tone, Icon } = sourceLook(source);
  return (
    <Tag variant="outline" tone={tone} dot={false} title={reporter ? `${source} · reported by ${reporter}` : source ?? undefined} className="min-w-0 max-w-full">
      <Icon size={12} strokeWidth={2} aria-hidden="true" className="shrink-0" style={{ color: TONE[tone] }} />
      <span className="truncate">{source || 'Unknown source'}</span>
    </Tag>
  );
};

/** Icon in a soft square of its hue (same as the dashboard KPI icons). */
export const IconTile: React.FC<{ color: string; size?: number; children: React.ReactNode; className?: string }> = ({ color, size = 32, children, className = '' }) => (
  <span className={`rounded-lg flex items-center justify-center shrink-0 ${className}`}
    style={{ width: size, height: size, background: `${color}14`, color }}>
    {children}
  </span>
);
