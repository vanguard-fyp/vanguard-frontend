import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '../../hooks';
import { UserManagementTable } from '../../components/ui/system/UserManagementTable';
import { UserEditModal } from '../../components/ui/system/UserEditModal';
import { SystemSettingsPanel } from '../../components/ui/system/SystemSettingsPanel';
import type { AdminSection, UserAccount } from '../../types';
import { adminTabs, containerAnim, itemAnim } from '../../constants';

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
        status: 'Active',
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
    <motion.div variants={containerAnim} initial="hidden" animate="show" className="space-y-6">
      {/* Page Header */}
      <motion.div variants={itemAnim} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">System Administration</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Admin Management · User directory & agency integration
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {activeTab === 'users' && (
            <button
              onClick={handleOpenCreateUser}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <Plus size={15} />
              <span>Create User Account</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* Segmented Tab Bar */}
      <motion.div variants={itemAnim} className="bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80 inline-flex w-auto">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {adminTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={tab.sub}
                className={`relative px-4 py-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 rounded-xl shrink-0 group ${isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'
                  }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeAdminTabBg"
                    className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  size={15}
                  className={`relative z-10 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                />
                <span className="relative z-10">{tab.title}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Main Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'users' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
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

        {activeTab === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <SystemSettingsPanel />
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Create / Edit Modal */}
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