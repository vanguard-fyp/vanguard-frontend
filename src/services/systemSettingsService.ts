import { apiClient } from './apiClient';

export type SettingGroup = 'early_warning' | 'hazard' | 'workflow';

/** One runtime threshold; every value here is read by the backend. */
export interface SystemSetting {
  key: string;
  group: SettingGroup;
  label: string;
  unit: string;
  kind: 'int' | 'float' | 'choice';
  value: number;
  default: number;
  is_default: boolean;
  minimum: number | null;
  maximum: number | null;
  step: number;
  options: { value: number; label: string }[];
  help: string;
  updated_at: string | null;
  updated_by: string | null;
}

export interface SystemSettingsResponse {
  items: SystemSetting[];
  /** false when the system_settings table is missing (migration not applied) */
  storage_available: boolean;
  cache_seconds: number;
}

export const systemSettingsService = {
  list: (): Promise<SystemSettingsResponse> => apiClient.get<SystemSettingsResponse>('/system/settings'),
  update: (key: string, value: number): Promise<SystemSetting> =>
    apiClient.put<SystemSetting>(`/system/settings/${key}`, { value }),
  reset: (key: string): Promise<SystemSetting> => apiClient.delete<SystemSetting>(`/system/settings/${key}`),
};
