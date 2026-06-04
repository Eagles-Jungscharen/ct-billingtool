import { authFetch } from './client';
import type { RechnungDto, CreateUpdateRechnungData } from './types';

export const fetchRechnungen = async (token: string): Promise<RechnungDto[]> =>
  authFetch<RechnungDto[]>('/api/invoices', token);

export const fetchRechnung = async (token: string, id: string): Promise<RechnungDto> =>
  authFetch<RechnungDto>(`/api/invoices/${id}`, token);

export const createRechnung = async (
  token: string,
  data: CreateUpdateRechnungData,
): Promise<RechnungDto> =>
  authFetch<RechnungDto>('/api/invoices', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateRechnung = async (
  token: string,
  id: string,
  data: CreateUpdateRechnungData,
): Promise<RechnungDto> =>
  authFetch<RechnungDto>(`/api/invoices/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteRechnung = async (token: string, id: string): Promise<void> =>
  authFetch<void>(`/api/invoices/${id}`, token, { method: 'DELETE' });
