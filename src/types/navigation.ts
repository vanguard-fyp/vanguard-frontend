import React from 'react';
import type { UserRole } from './index';

export interface NavChild {
  label: string;
  path: string;
}

export interface NavItem {
  label: string;
  path?: string;
  icon: React.ReactNode;
  children?: NavChild[];
}

export interface NavSection {
  section: string;
  items: NavItem[];
}

export interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

export interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}
