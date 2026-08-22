// ─── System Administration Constants ─────────────────────────────────────────
import type { UserRole } from '../../types';

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

// Permission level options — used in the roles & permissions matrix
export const permOptions = [
  'Full Access',
  'Verify & Manage',
  'Assign & Track',
  'Approve & Allocate',
  'Broadcast Access',
  'View Only',
  'Request Only',
  'No Access',
];
