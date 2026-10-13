import type { UserAccount } from ".";

export interface MatrixRow {
  module: string;
  officer: string;
  coordinator: string;
  manager: string;
  admin: string;
}

export interface AgencyItem {
  id: string;
  name: string;
  type: string;
  contact: string;
  status: 'Connected' | 'Standby' | 'Disconnected';
}

export type AdminSection = 'users' | 'rbac' | 'settings';

export interface AdminTab {
  id: AdminSection;
  title: string;
  sub: string;
  icon: React.FC<{ size?: number; className?: string }>;
}

export interface UserManagementTableProps {
  onEditUser: (user: UserAccount) => void;
  onDeleteUser: (id: string) => void;
  onToggleUserStatus: (user: UserAccount) => void;
}

export interface UserEditModalProps {
  isOpen: boolean;
  user: UserAccount | null;
  onClose: () => void;
  onSave: (data: Partial<UserAccount>) => void;
}
