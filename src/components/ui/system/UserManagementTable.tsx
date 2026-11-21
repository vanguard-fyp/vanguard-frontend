import { DataRegion } from '../../common/DataRegion';
import React, { useEffect, useMemo, useState } from 'react';
import { Users, Search, Edit2, Trash2, SlidersHorizontal, Send } from 'lucide-react';
import type { UserAccount, UserManagementTableProps } from '../../../types';
import { userRolesFilterList as roles } from '../../../constants';
import { ConfirmationDialog } from '../shared/ConfirmationDialog';
import { formatDateTime } from '../../../utils/dateFormatter';
import { useResendInvite, useUsers } from '../../../hooks/useUsers';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { PaginationBar } from '../shared/PaginationBar';

export const UserManagementTable: React.FC<UserManagementTableProps> = ({
  onEditUser,
  onDeleteUser,
  onToggleUserStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const PAGE_SIZE = 15;

  // Cached user accounts query — fast, zero-delay instant search in client memory
  const usersQuery = useUsers();
  const { data: allUsers = [], isLoading, isError, refetch, isFetching } = usersQuery;
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const resendInvite = useResendInvite();

  const handleResend = (u: UserAccount) => {
    resendInvite.mutate(u.id, {
      onSuccess: () => toast.success('Invite sent', `A new invite link was emailed to ${u.email}.`),
      onError: (e) => toast.error('Invite not sent', e instanceof Error ? e.message : undefined),
    });
  };

  const filteredUsers = useMemo(() => {
    let list = allUsers.filter((u) => {
      if (
        currentUser &&
        (String(u.id) === String(currentUser.id) ||
          (u.email && u.email.toLowerCase() === currentUser.email?.toLowerCase()))
      ) {
        return false;
      }
      return true;
    });

    if (roleFilter !== 'All') {
      list = list.filter((u) => u.role === roleFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (u) =>
          (u.name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.agency || '').toLowerCase().includes(q) ||
          (u.role || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [allUsers, roleFilter, searchQuery, currentUser]);

  useEffect(() => {
    setPageIndex(0);
  }, [searchQuery, roleFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pagedUsers = useMemo(() => {
    const start = pageIndex * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, pageIndex]);

  const handleConfirmDelete = () => {
    if (userToDelete) {
      onDeleteUser(userToDelete.id);
      setUserToDelete(null);
    }
  };

  return (
    <DataRegion queries={[usersQuery]} label="User directory"><div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-0">
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
              <th className="px-5 py-3">User Name</th>
              <th className="px-4 py-3">Email Address</th>
              <th className="px-4 py-3">Agency</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last Active</th>
              <th className="px-5 py-3 text-right">Configure / Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-xs text-slate-400 font-medium">Loading user accounts…</td>
              </tr>
            ) : isError && usersQuery.data === undefined ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-xs text-red-700 font-medium">
                  User accounts could not be loaded.{' '}
                  <button onClick={() => refetch()} className="underline font-bold cursor-pointer">Retry</button>
                </td>
              </tr>
            ) : pagedUsers.length > 0 ? (
              pagedUsers.map((user) => (
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
                  <td className="px-4 py-3.5 text-xs text-slate-500 font-medium">
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
                      onClick={() => onToggleUserStatus(user)}
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
                    {user.last_active && user.last_active !== 'Never' ? (
                      <div className="flex flex-col" title={formatDateTime(user.last_active)}>
                        <span className="text-slate-700 font-semibold">{formatDateTime(user.last_active)}</span>
                        {/* <span className="text-[10px] text-slate-400 font-normal">({formatRelativeTime(user.last_active)})</span> */}
                      </div>
                    ) : (
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="text-amber-700 font-semibold">Invite pending</span>
                        <button
                          type="button"
                          onClick={() => handleResend(user)}
                          disabled={resendInvite.isPending && resendInvite.variables === user.id}
                          className="flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-default"
                        >
                          <Send size={11} aria-hidden="true" />
                          {resendInvite.isPending && resendInvite.variables === user.id ? 'Sending…' : 'Resend invite'}
                        </button>
                      </div>
                    )}
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
      {filteredUsers.length > 0 && (
        <div className="px-4 border-t border-slate-100">
          <PaginationBar
            pageIndex={pageIndex}
            pageCount={pageCount}
            total={filteredUsers.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPageIndex}
            isFetching={isFetching}
            label="accounts"
          />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationDialog
        isOpen={!!userToDelete}
        title="Remove User Account"
        message={
          <>
            Are you sure you want to remove{" "}
            <span className="font-bold text-slate-900">
              {userToDelete?.name}
            </span>{" "}
            (
            <span className="font-bold text-slate-900">
              {userToDelete?.email}
            </span>
            )? This action will revoke their EOC system credentials.
          </>
        }
        confirmLabel="Remove User"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setUserToDelete(null)}
      />
    </div></DataRegion>
  );
};
