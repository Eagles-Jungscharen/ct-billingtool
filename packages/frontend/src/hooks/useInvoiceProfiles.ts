import { useQuery } from '@tanstack/react-query';
import { fetchRechnungsprofile } from '../api/invoiceProfiles';
import { useAppAuth } from './useAppAuth';

export const useRechnungsprofile = () => {
  const { token, isAuthenticated } = useAppAuth();

  return useQuery({
    queryKey: ['invoice-profiles'],
    queryFn: () => fetchRechnungsprofile(token!),
    enabled: isAuthenticated && !!token,
    staleTime: 5 * 60 * 1000,
  });
};
