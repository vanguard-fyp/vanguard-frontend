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
  'Emergency Alert': 'bg-red-50 text-red-700 border-red-200',
  'Evacuation Order': 'bg-orange-50 text-orange-700 border-orange-200',
  'Safety Announcement': 'bg-blue-50 text-blue-700 border-blue-200',
};

// Filter options — used in CommunicationFilters component
export const categories: CommunicationCategoryFilter[] = [
  'All',
  'Emergency Alert',
  'Evacuation Order',
  'Safety Announcement',
];

export const severities: string[] = ['All', 'Critical', 'High', 'Medium', 'Low'];
