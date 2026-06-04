import React, { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';

export const OidcCallback: React.FunctionComponent = () => {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.isLoading && !auth.error) {
      navigate('/invoices', { replace: true });
    }
  }, [auth.isLoading, auth.error, navigate]);

  if (auth.error) {
    return <div>Authentifizierung fehlgeschlagen: {auth.error.message}</div>;
  }

  return null;
};
