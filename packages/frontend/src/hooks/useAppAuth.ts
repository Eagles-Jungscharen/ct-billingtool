import { useContext } from 'react';
import { AppAuthContext, type AppAuthContextValue } from '../context/AppAuthContext';

export const useAppAuth = (): AppAuthContextValue => {
  const ctx = useContext(AppAuthContext);
  if (!ctx) {
    throw new Error('useAppAuth must be used within AuthProvider');
  }
  return ctx;
};
