import type { SeverityLevel } from '../types';

/* ============================================================
   VANGUARD — Central Design System & Theme Constants
   ============================================================ */

export const SIDEBAR_THEME = {
  bg: '#1e293b',   // Unified Slate 800 canvas
  bgHeader: '#1e293b',   // Seamless matching header
  bgFooter: '#1e293b',   // Seamless matching footer
  sectionLabel: '#94a3b8',   // Muted slate 400
  parentInactive: '#cbd5e1',   // Soft slate 300 text
  parentHoverBg: 'rgba(255, 255, 255, 0.05)',
  parentActiveBg: 'rgba(59, 130, 246, 0.16)', // Soft harmonic blue fill
  parentActiveText: '#f8fafc',
  childInactive: '#94a3b8',
  childHoverBg: 'rgba(255, 255, 255, 0.04)',
  childActiveBg: 'rgba(59, 130, 246, 0.2)',
  childActiveText: '#ffffff',
  childActiveDot: '#60a5fa',
  divider: 'rgba(255, 255, 255, 0.07)',
  profileName: '#f8fafc',
  profileRole: '#94a3b8',
  logoBg: '#2563eb',
};

/**
 * Calm, Non-Neon Disaster Badges Color Mapping
 */
export const SEVERITY_BADGE_MAP: Record<SeverityLevel, { bg: string; text: string; border: string; dot: string }> = {
  Critical: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca', dot: '#dc2626' },
  High: { bg: '#fff7ed', text: '#9a3412', border: '#ffedd5', dot: '#ea580c' },
  Medium: { bg: '#fffbeb', text: '#92400e', border: '#fef3c7', dot: '#d97706' },
  Low: { bg: '#f0fdf4', text: '#166534', border: '#dcfce7', dot: '#16a34a' },
};

export const DISASTER_LEVEL_BADGE_MAP: Record<string, { bg: string; text: string; border: string }> = {
  'Level 1: District': { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' },
  'Level 2: State': { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
  'Level 3: Federal': { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
};

/**
 * KPI Stat Cards Accent Styles
 */
export const KPI_ACCENT_MAP = {
  red: { iconBg: '#fef2f2', iconBorder: '#fecaca', iconColor: '#991b1b', valueColor: '#991b1b' },
  orange: { iconBg: '#fff7ed', iconBorder: '#ffedd5', iconColor: '#9a3412', valueColor: '#9a3412' },
  yellow: { iconBg: '#fffbeb', iconBorder: '#fef3c7', iconColor: '#92400e', valueColor: '#92400e' },
  green: { iconBg: '#f0fdf4', iconBorder: '#dcfce7', iconColor: '#166534', valueColor: '#166534' },
  blue: { iconBg: '#f0f9ff', iconBorder: '#e0f2fe', iconColor: '#0369a1', valueColor: '#0f172a' },
  purple: { iconBg: '#f8fafc', iconBorder: '#e2e8f0', iconColor: '#475569', valueColor: '#0f172a' },
};

/** Severity color hex codes for chart visualizations */
export const SEVERITY_COLORS: Record<string, string> = {
  Critical: '#dc2626',
  High:     '#ea580c',
  Medium:   '#d97706',
  Low:      '#16a34a',
};

/** Severity badge Tailwind class mappings */
export const SEVERITY_BADGE_STYLES: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700 border-red-200',
  High:     'bg-orange-100 text-orange-700 border-orange-200',
  Medium:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low:      'bg-green-100 text-green-700 border-green-200',
};

/** Framer Motion entrance animation variants */
export const DASHBOARD_ANIMATIONS = {
  container: {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
  },
  item: {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
  },
};

// Landing & login color
export const INK = '#0f172a';
export const PAPER = '#eef2f7';
export const BLUE = '#2563eb';

// Common animation
export const containerAnim = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
export const itemAnim = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};