import { apiClient } from './apiClient';
import type { Warehouse } from '../types';

export const warehouseService = {
  async getWarehouses(): Promise<Warehouse[]> {
    return apiClient.get<Warehouse[]>('/warehouses');
  },

  async getWarehouse(id: string): Promise<Warehouse> {
    return apiClient.get<Warehouse>(`/warehouses/${id}`);
  },

  async createWarehouse(warehouse: Partial<Warehouse>): Promise<Warehouse> {
    return apiClient.post<Warehouse>('/warehouses', warehouse);
  },

  async updateWarehouse(id: string, updates: Partial<Warehouse>): Promise<Warehouse> {
    return apiClient.patch<Warehouse>(`/warehouses/${id}`, updates);
  },

  async deleteWarehouse(id: string): Promise<void> {
    await apiClient.delete<void>(`/warehouses/${id}`);
  },
};
