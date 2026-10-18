// ─── System Administration Constants ─────────────────────────────────────────
import { Users, Sliders } from 'lucide-react';
import type { AdminTab, MatrixRow, UserRole } from '../../types';

// User role lists — used in dropdowns, filters, and modals.
// Only the 2 web admin roles are shown here; Citizen Reporter and
// System / Sensor Bot are mobile-app roles that don't appear in the
// web admin user management UI.
export const userRolesFilterList = [
  'All',
  'NADMA Lead Officer',
  'Disaster Management Officer',
  'Citizen Reporter',
  'System / Sensor Bot',
];

export const userRolesList: UserRole[] = [
  'NADMA Lead Officer',
  'Disaster Management Officer',
  'Citizen Reporter',
  'System / Sensor Bot'
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
  'Public Citizen'
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
  { id: 'settings', title: 'Operational Thresholds', sub: 'AI Risk & Alert Triggers', icon: Sliders },
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