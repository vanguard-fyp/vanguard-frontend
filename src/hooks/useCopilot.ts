import { useQuery, useQueryClient } from '@tanstack/react-query';
import { copilotService } from '../services/copilotService';
import type { CopilotTask } from '../types';

export const COPILOT_KEYS = {
  all: ['copilot'] as const,
  tasks: () => [...COPILOT_KEYS.all, 'tasks'] as const,
};

export function useCopilotTasks(options?: { enabled?: boolean }) {
  const qc = useQueryClient();

  const query = useQuery<CopilotTask[]>({
    queryKey: COPILOT_KEYS.tasks(),
    queryFn: () => copilotService.getTodayTasks(false),
    staleTime: 60_000, // 1 min fresh
    gcTime: 5 * 60_000,
    enabled: options?.enabled ?? true,
    refetchOnWindowFocus: false,
  });

  const refetchTasks = async (force: boolean = false) => {
    if (force) {
      const fresh = await copilotService.getTodayTasks(true);
      qc.setQueryData(COPILOT_KEYS.tasks(), fresh);
      return fresh;
    }
    return query.refetch();
  };

  return {
    ...query,
    tasks: query.data ?? [],
    refetchTasks,
  };
}
