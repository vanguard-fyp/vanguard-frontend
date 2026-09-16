import { apiClient } from './apiClient';
import type { CopilotTask, CopilotChatResponse } from '../types';

export const copilotService = {
  /**
   * Fetch today's focus task cards prioritized for the active officer
   */
  getTodayTasks: async (): Promise<CopilotTask[]> => {
    return apiClient.get<CopilotTask[]>('/copilot/tasks');
  },

  /**
   * Send a query or instruction to the Vanguard AI Sentinel
   */
  chat: async (message: string): Promise<CopilotChatResponse> => {
    return apiClient.post<CopilotChatResponse>('/copilot/chat', { message });
  },
};
