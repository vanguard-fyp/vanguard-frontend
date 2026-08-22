// ─── Public Communication Constants ──────────────────────────────────────────
import React from 'react';
import { Smartphone, Globe, Tv, AlertTriangle, Shield, Bell } from 'lucide-react';
import type { CommunicationCategoryFilter, CommunicationChannelFilter } from '../types';

// Icon maps — used to render icons per channel/category in cards and modals
export const channelIcons: Record<string, React.ReactNode> = {
  'SMS Broadcast': <Smartphone size={12} />,
  'MyJPJ App': <Globe size={12} />,
  'NADMA Portal': <Globe size={12} />,
  'TV/Radio Alert': <Tv size={12} />,
};

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

export const channels: CommunicationChannelFilter[] = [
  'All',
  'SMS Broadcast',
  'MyJPJ App',
  'NADMA Portal',
  'TV/Radio Alert',
];

// Available broadcast channels — used in the compose modal
export const availableChannels = ['SMS Broadcast', 'MyJPJ App', 'NADMA Portal', 'TV/Radio Alert'];
