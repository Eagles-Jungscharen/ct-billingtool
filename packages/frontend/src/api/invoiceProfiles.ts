import { authFetch } from './client';
import type { RechnungsprofilDto, CreateUpdateRechnungsprofilData } from './types';

export const fetchRechnungsprofile = async (token: string): Promise<RechnungsprofilDto[]> =>
  authFetch<RechnungsprofilDto[]>('/api/invoice-profiles', token);

export const createRechnungsprofil = async (
  token: string,
  data: CreateUpdateRechnungsprofilData,
): Promise<RechnungsprofilDto> =>
  authFetch<RechnungsprofilDto>('/api/invoice-management/invoice-profiles', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateRechnungsprofil = async (
  token: string,
  id: string,
  data: CreateUpdateRechnungsprofilData,
): Promise<RechnungsprofilDto> =>
  authFetch<RechnungsprofilDto>(`/api/invoice-management/invoice-profiles/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteRechnungsprofil = async (token: string, id: string): Promise<void> =>
  authFetch<void>(`/api/invoice-management/invoice-profiles/${id}`, token, { method: 'DELETE' });
