import { authFetch } from './client';
import type { MeDto } from '@ct-billingtool/shared';

export const fetchMe = async (token: string): Promise<MeDto> =>
  authFetch<MeDto>('/api/me', token);
