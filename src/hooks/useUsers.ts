/**
 * useUsers — TanStack Query hooks for user accounts
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/userService';
import type { UserAccount } from '../types';

export const USER_KEYS = {
  all: ['users'] as const,
};

export function useUsers() {
  return useQuery({
    queryKey: USER_KEYS.all,
    queryFn: () => userService.getUsers(),
    staleTime: 30_000,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<UserAccount>) => userService.createUser(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USER_KEYS.all });
    },
  });
}

export function useResendInvite() {
  return useMutation({
    mutationFn: (id: string) => userService.resendInvite(id),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<UserAccount> }) =>
      userService.updateUser(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USER_KEYS.all });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userService.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USER_KEYS.all });
    },
  });
}

export function useUploadAvatar() {
  return useMutation({
    mutationFn: (file: File) => userService.uploadAvatar(file),
  });
}
