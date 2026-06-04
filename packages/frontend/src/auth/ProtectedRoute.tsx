import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppAuth } from '../hooks/useAppAuth';

export const ProtectedRoute: React.FunctionComponent<React.PropsWithChildren> = (
  props: React.PropsWithChildren,
) => {
  const { children } = props;
  const { isAuthenticated, isLoading } = useAppAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
