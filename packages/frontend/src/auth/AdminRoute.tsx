import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppAuth } from '../hooks/useAppAuth';

export const AdminRoute: React.FunctionComponent<React.PropsWithChildren> = (
  props: React.PropsWithChildren,
) => {
  const { children } = props;
  const { isAuthenticated, isAdmin, isLoading } = useAppAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
