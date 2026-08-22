import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, Shield, Building2, Settings } from 'lucide-react';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '../../hooks';
import { UserManagementTable } from '../../components/ui/system/UserManagementTable';
import { UserEditModal } from '../../components/ui/system/UserEditModal';
import { RolesPermissionsMatrix } from '../../components/ui/system/RolesPermissionsMatrix';
import { AgencyManagementList } from '../../components/ui/system/AgencyManagementList';
import { SystemSettingsPanel } from '../../components/ui/system/SystemSettingsPanel';
import type { UserAccount } from '../../types';

const containerAnim = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemAnim = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

type AdminSection = 'users' | 'rbac' | 'agencies' | 'settings';

interface AdminTab {
  id: AdminSection;
  title: string;
  sub: string;
  icon: React.FC<{ size?: number; className?: string }>;
}

const adminTabs: AdminTab[] = [
  { id: 'users', title: 'User Management', sub: 'Accounts & CRUD', icon: Users },
  { id: 'rbac', title: 'Roles & Permissions', sub: 'RBAC Access Matrix', icon: Shield },
  { id: 'agencies', title: 'Agency Directory', sub: 'Emergency APIs', icon: Building2 },
  { id: 'settings', title: 'System Settings', sub: 'AI Thresholds & Gateways', icon: Settings },
];

const SystemAdministration: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminSection>('users');
  const { data: users = [] } = useUsers();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // User CRUD Handlers
  const handleOpenCreateUser = () => {
    setSelectedUser(null);
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user: UserAccount) => {
    setSelectedUser(user);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (data: Partial<UserAccount>) => {
    if (selectedUser) {
      updateUserMutation.mutate({ id: selectedUser.id, updates: data });
    } else {
      createUserMutation.mutate({
        name: data.name || 'New Officer',
        email: data.email || 'officer@nadma.gov.my',
        agency: data.agency || 'NADMA Malaysia',
        role: data.role || 'Disaster Management Officer',
        status: data.status || 'Active',
      });
    }
  };

  const handleDeleteUser = (id: string) => {
    deleteUserMutation.mutate(id);
  };

  const handleToggleUserStatus = (id: string) => {
    const user = users.find((u) => u.id === id);
    if (user) {
      updateUserMutation.mutate({
        id,
        updates: { status: user.status === 'Active' ? 'Inactive' : 'Active' },
      });
    }
  };

  return (
    <motion.div
      variants={containerAnim}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemAnim} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">System Administration</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Admin Management · User settings directory, operational RBAC controls, agency integration, and system thresholds
          </p>
        </div>
        {activeTab === 'users' && (
          <button
            onClick={handleOpenCreateUser}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Plus size={16} />
            Create User Account
          </button>
        )}
      </motion.div>

      {/* Ultra-Minimalist Segmented Tab Bar */}
      <motion.div variants={itemAnim} className="bg-slate-100/70 p-1.5 rounded-2xl border border-slate-200/60 inline-flex w-auto">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {adminTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={tab.sub} // Subtle browser tooltip on hover
                className={`relative px-5 py-2.5 text-xs font-semibold transition-colors duration-200 cursor-pointer flex items-center gap-2.5 rounded-xl shrink-0 group ${isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                {/* Smooth Sliding Active Background Pill */}
                {isActive && (
                  <motion.div
                    layoutId="activeAdminTabBg"
                    className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/80"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}

                {/* Minimalist Icon */}
                <Icon
                  size={16}
                  className={`relative z-10 transition-colors duration-200 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                />

                {/* Clean Title */}
                <span className="relative z-10 font-bold tracking-tight text-xs">
                  {tab.title}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Active Configuration Panel View */}
      <AnimatePresence mode="wait">
        {activeTab === 'users' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <UserManagementTable
              users={users}
              onEditUser={handleOpenEditUser}
              onDeleteUser={handleDeleteUser}
              onToggleUserStatus={handleToggleUserStatus}
            />
          </motion.div>
        )}

        {activeTab === 'rbac' && (
          <motion.div
            key="rbac"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <RolesPermissionsMatrix />
          </motion.div>
        )}

        {activeTab === 'agencies' && (
          <motion.div
            key="agencies"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <AgencyManagementList />
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <SystemSettingsPanel />
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Create/Edit Modal */}
      <UserEditModal
        isOpen={isUserModalOpen}
        user={selectedUser}
        onClose={() => setIsUserModalOpen(false)}
        onSave={handleSaveUser}
      />
    </motion.div>
  );
};

export default SystemAdministration;