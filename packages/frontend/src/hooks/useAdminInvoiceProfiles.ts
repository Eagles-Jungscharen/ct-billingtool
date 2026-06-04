import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchRechnungsprofile,
  createRechnungsprofil,
  updateRechnungsprofil,
  deleteRechnungsprofil,
} from '../api/invoiceProfiles';
import { useAppAuth } from './useAppAuth';
import type { CreateUpdateRechnungsprofilData } from '../api/types';

export const useAdminRechnungsprofile = () => {
  const { token, isAuthenticated, isAdmin } = useAppAuth();

  return useQuery({
    queryKey: ['admin', 'invoice-profiles'],
    queryFn: () => fetchRechnungsprofile(token!),
    enabled: isAuthenticated && !!token && isAdmin,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateRechnungsprofil = () => {
  const { token } = useAppAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUpdateRechnungsprofilData) => createRechnungsprofil(token!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'invoice-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-profiles'] });
    },
  });
};

export const useUpdateRechnungsprofil = () => {
  const { token } = useAppAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateUpdateRechnungsprofilData }) =>
      updateRechnungsprofil(token!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'invoice-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-profiles'] });
    },
  });
};

export const useDeleteRechnungsprofil = () => {
  const { token } = useAppAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteRechnungsprofil(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'invoice-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-profiles'] });
    },
  });
};
