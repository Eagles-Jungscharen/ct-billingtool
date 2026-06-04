import { authFetch } from './client';
import type { MeDto } from './types';

export const fetchMe = async (token: string): Promise<MeDto> =>
  authFetch<MeDto>('/api/me', token);
