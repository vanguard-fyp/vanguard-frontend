// ─── Public Communication Constants ──────────────────────────────────────────
import React from 'react';
import { AlertTriangle, Shield, Bell } from 'lucide-react';
import type { CommunicationCategoryFilter } from '../types';

export const categoryIcons: Record<string, React.ReactNode> = {
  'Emergency Alert': <AlertTriangle size={16} className="text-red-600" />,
  'Evacuation Order': <Shield size={16} className="text-orange-600" />,
  'Safety Announcement': <Bell size={16} className="text-blue-600" />,
};

export const categoryBadgeStyle: Record<string, string> = {
  'Emergency Alert': 'bg-[#fdf0f0] text-[#b03a3a] border-[#f5d5d5]',
  'Evacuation Order': 'bg-[#fdf3ea] text-[#b4601f] border-[#f6dfca]',
  'Safety Announcement': 'bg-[#eaf2fc] text-[#2f62a8] border-[#d2e1f5]',
};

/** Severity on a broadcast card: muted, since the card is a record of what was sent. */
export const commSeverityStyle: Record<string, { badge: string; dot: string }> = {
  Critical: { badge: 'bg-[#fdf0f0] text-[#b03a3a] border-[#f5d5d5]', dot: 'bg-[#dc6b6b]' },
  High: { badge: 'bg-[#fdf3ea] text-[#b4601f] border-[#f6dfca]', dot: 'bg-[#e6934f]' },
  Medium: { badge: 'bg-[#fdf7e3] text-[#96740f] border-[#f2e4b4]', dot: 'bg-[#dcb33f]' },
  Low: { badge: 'bg-[#f1f4f8] text-[#4f5f75] border-[#e0e6ee]', dot: 'bg-[#94a3b8]' },
};

// Filter options — used in CommunicationFilters component
export const categories: CommunicationCategoryFilter[] = [
  'All',
  'Emergency Alert',
  'Evacuation Order',
  'Safety Announcement',
];

export const severities: string[] = ['All', 'Critical', 'High', 'Medium', 'Low'];
