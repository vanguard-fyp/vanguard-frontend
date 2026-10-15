import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { systemSettingsService } from '../services/systemSettingsService';

const KEY = ['system', 'settings'] as const;

export function useSystemSettings() {
  return useQuery({ queryKey: KEY, queryFn: systemSettingsService.list, staleTime: 60_000 });
}

export function useUpdateSystemSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: number }) => systemSettingsService.update(key, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useResetSystemSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => systemSettingsService.reset(key),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
