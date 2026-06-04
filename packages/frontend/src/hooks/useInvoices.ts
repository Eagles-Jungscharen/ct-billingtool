import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchRechnungen,
  fetchRechnung,
  createRechnung,
  updateRechnung,
  deleteRechnung,
} from '../api/invoices';
import { useAppAuth } from './useAppAuth';
import type { CreateUpdateRechnungData } from '../api/types';

export const useRechnungen = () => {
  const { token, isAuthenticated } = useAppAuth();

  return useQuery({
    queryKey: ['invoices'],
    queryFn: () => fetchRechnungen(token!),
    enabled: isAuthenticated && !!token,
    staleTime: 2 * 60 * 1000,
  });
};

export const useRechnung = (id: string) => {
  const { token, isAuthenticated } = useAppAuth();

  return useQuery({
    queryKey: ['invoices', id],
    queryFn: () => fetchRechnung(token!, id),
    enabled: isAuthenticated && !!token && !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateRechnung = () => {
  const { token } = useAppAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUpdateRechnungData) => createRechnung(token!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

export const useUpdateRechnung = () => {
  const { token } = useAppAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateUpdateRechnungData }) =>
      updateRechnung(token!, id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', id] });
    },
  });
};

export const useDeleteRechnung = () => {
  const { token } = useAppAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteRechnung(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};
