import {
  LayoutDashboard,
  Radar,
  ShieldCheck,
  Megaphone,
  BarChart3,
  Settings,
} from 'lucide-react';
import type { NavSection } from '../types';

// ─── Navigation Structure ─────────────────────────────────────────────────────
export const NAV_STRUCTURE: NavSection[] = [
  {
    section: 'MAIN',
    items: [
      { label: 'EOC Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
    ],
  },
  {
    section: 'OPERATIONS',
    items: [
      {
        label: 'Situational Awareness',
        icon: <Radar size={18} />,
        children: [
          { label: 'Incident Management', path: '/situational/incidents' },
          { label: 'Disaster Intelligence', path: '/situational/intelligence' },
        ],
      },
      {
        label: 'Response Coordination',
        icon: <ShieldCheck size={18} />,
        children: [
          { label: 'Rescue Operations', path: '/response/rescue' },
          { label: 'Resource Management', path: '/response/resources' },
        ],
      },
    ],
  },
  {
    section: 'ENGAGEMENT',
    items: [
      { label: 'Public Communication', path: '/communication', icon: <Megaphone size={18} /> },
    ],
  },
  {
    section: 'INTELLIGENCE',
    items: [
      { label: 'Reports & Analytics', path: '/analytics', icon: <BarChart3 size={18} /> },
    ],
  },
];

// ─── System-Level Nav (Admin only) ───────────────────────────────────────────
export const SYSTEM_NAV_ITEM = {
  label: 'System Administration',
  path: '/system',
  icon: <Settings size={18} />,
};
