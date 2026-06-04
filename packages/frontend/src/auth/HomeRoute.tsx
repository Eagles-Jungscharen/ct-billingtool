import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppAuth } from '../hooks/useAppAuth';
import { LandingPage } from '../pages/LandingPage';

export const HomeRoute: React.FunctionComponent = () => {
  const { isAuthenticated, isLoading } = useAppAuth();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/invoices" replace />;
  }

  return <LandingPage />;
};
