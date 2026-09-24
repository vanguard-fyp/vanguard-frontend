import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseService } from '../services/warehouseService';
import type { Warehouse } from '../types';

export const warehouseKeys = {
  all: ['warehouses'] as const,
  lists: () => [...warehouseKeys.all, 'list'] as const,
  detail: (id: string) => [...warehouseKeys.all, 'detail', id] as const,
};

export const useWarehouses = () => {
  return useQuery({
    queryKey: warehouseKeys.lists(),
    queryFn: warehouseService.getWarehouses,
  });
};

export const useWarehouse = (id: string) => {
  return useQuery({
    queryKey: warehouseKeys.detail(id),
    queryFn: () => warehouseService.getWarehouse(id),
    enabled: Boolean(id),
  });
};

export const useCreateWarehouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (warehouse: Partial<Warehouse>) => warehouseService.createWarehouse(warehouse),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.all });
    },
  });
};
