import React, { useState } from 'react';
import { Users, Search, Edit2, Trash2, SlidersHorizontal } from 'lucide-react';
import type { UserAccount, UserManagementTableProps } from '../../../types';
import { userRolesFilterList as roles } from '../../../constants';
import { useAuth } from '../../../context/AuthContext';
import { ConfirmationDialog } from '../shared/ConfirmationDialog';

export const UserManagementTable: React.FC<UserManagementTableProps> = ({
  users,
  onEditUser,
  onDeleteUser,
  onToggleUserStatus,
}) => {
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);

  // Exclude current logged in user from management list
  const managedUsers = users.filter((u) => {
    if (!currentUser) return true;
    return u.id !== currentUser.id && u.email !== currentUser.email;
  });

  const filteredUsers = managedUsers.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.agency.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleConfirmDelete = () => {
    if (userToDelete) {
      onDeleteUser(userToDelete.id);
      setUserToDelete(null);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-0">
      {/* Header & Filter Controls */}
      <div className="px-5 py-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">System User Accounts Directory</h3>
          <span className="text-xs font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
            {filteredUsers.length} Users
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <SlidersHorizontal size={12} className="text-slate-400" />
            <span>Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-semibold focus:outline-none focus:border-blue-600 shadow-2xs cursor-pointer"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user name or agency..."
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 w-56 shadow-2xs transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wide text-left">
              <th className="px-5 py-3">Officer Name</th>
              <th className="px-4 py-3">Email Address</th>
              <th className="px-4 py-3">Agency</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last Active</th>
              <th className="px-5 py-3 text-right">Configure / Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      {/* Avatar */}
                      <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-200 bg-blue-50 flex items-center justify-center shrink-0">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-bold text-blue-600">
                            {user.name.trim().split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500 font-mono font-medium">
                    {user.email}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-700 font-semibold">{user.agency}</td>
                  <td className="px-4 py-3.5">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-100">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => onToggleUserStatus(user.id)}
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 cursor-pointer transition-colors ${user.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'
                          }`}
                      />
                      {user.status}
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500 font-medium">
                    {user.last_active}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEditUser(user)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Edit2 size={12} />
                        Configure
                      </button>
                      <button
                        onClick={() => setUserToDelete(user)}
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="Remove user account"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-xs text-slate-400 font-medium">
                  No other user accounts match your search or filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationDialog
        isOpen={!!userToDelete}
        title="Remove User Account"
        message={`Are you sure you want to remove ${userToDelete?.name} (${userToDelete?.email})? This action will revoke their EOC system credentials.`}
        confirmLabel="Remove User"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  );
};
