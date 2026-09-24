// ─── System Administration Constants ─────────────────────────────────────────
import { Users, Shield, Sliders } from 'lucide-react';
import type { AdminTab, MatrixRow, UserRole } from '../../types';

// User role lists — used in dropdowns, filters, and modals
export const userRolesFilterList = [
  'All',
  'Disaster Management Officer',
  'Rescue Coordinator',
  'Resource Manager',
  'Government Administrator',
];

export const userRolesList: UserRole[] = [
  'Disaster Management Officer',
  'Rescue Coordinator',
  'Resource Manager',
  'Government Administrator',
];

// Agency options — used in the user edit modal and agency management
export const agencyOptions = [
  'NADMA Malaysia',
  'SMART Strike Force',
  'APM Civil Defence',
  'BOMBA Water Rescue',
  'PDRM Police HQ',
  'JKM Social Welfare',
  'KKM Health Ministry',
];

// Permission level options — streamlined 4-tier standard RBAC permissions
export const permOptions = [
  'Full Access',
  'Manage & Action',
  'View Only',
  'No Access',
];

export const adminTabs: AdminTab[] = [
  { id: 'users', title: 'User Management', sub: 'Accounts & CRUD', icon: Users },
  { id: 'rbac', title: 'Roles & Permissions', sub: 'RBAC Access Matrix', icon: Shield },
  { id: 'settings', title: 'Intelligence Thresholds', sub: 'AI Risk & Alert Triggers', icon: Sliders },
];

// TODO: Matrix Row need to change to link db
export const initialMatrix: MatrixRow[] = [
  { module: 'Dashboard (Command Center)', officer: 'Full Access', coordinator: 'View Only', manager: 'View Only', admin: 'Full Access' },
  { module: 'Incident Management', officer: 'Manage & Action', coordinator: 'View Only', manager: 'View Only', admin: 'Full Access' },
  { module: 'Disaster Intelligence & GIS Map', officer: 'Full Access', coordinator: 'Full Access', manager: 'View Only', admin: 'Full Access' },
  { module: 'Rescue Operations & Missions', officer: 'View Only', coordinator: 'Manage & Action', manager: 'View Only', admin: 'Full Access' },
  { module: 'Resource Inventory & Requests', officer: 'View Only', coordinator: 'View Only', manager: 'Manage & Action', admin: 'Full Access' },
  { module: 'Public Alerts & Evacuation Orders', officer: 'Manage & Action', coordinator: 'No Access', manager: 'No Access', admin: 'Full Access' },
  { module: 'Reports & Export Analytics', officer: 'Full Access', coordinator: 'View Only', manager: 'View Only', admin: 'Full Access' },
  { module: 'System Admin & User Control', officer: 'No Access', coordinator: 'No Access', manager: 'No Access', admin: 'Full Access' },
];