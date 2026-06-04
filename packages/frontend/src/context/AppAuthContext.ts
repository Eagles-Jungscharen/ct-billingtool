import { createContext } from 'react';
import type { GroupDto } from '../api/types';

export interface AppAuthContextValue {
  isAuthenticated: boolean
  isLoading: boolean
  isAdmin: boolean
  groups: GroupDto[]
  displayName: string
  userId: string
  token: string | null
  login: () => void
  logout: () => void
}

export const AppAuthContext = createContext<AppAuthContextValue | null>(null);
