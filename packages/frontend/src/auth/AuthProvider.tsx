import React, { useEffect, useState } from 'react';
import { AuthProvider as OidcAuthProvider, useAuth as useOidcAuth } from 'react-oidc-context';
import { oidcConfig } from '../config/oidc';
import { fetchMe } from '../api/me';
import type { MeDto } from '../api/types';
import { AppAuthContext, type AppAuthContextValue } from '../context/AppAuthContext';

const InnerAuthProvider: React.FunctionComponent<React.PropsWithChildren> = (
  props: React.PropsWithChildren,
) => {
  const { children } = props;
  const oidc = useOidcAuth();
  const [me, setMe] = useState<MeDto | null>(null);
  const [meLoading, setMeLoading] = useState(false);

  const token = oidc.user?.access_token ?? null;

  useEffect(() => {
    if (!oidc.isAuthenticated || !token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMe(null);
      return;
    }
    setMeLoading(true);
    fetchMe(token)
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setMeLoading(false));
  }, [oidc.isAuthenticated, token]);

  const value: AppAuthContextValue = {
    isAuthenticated: oidc.isAuthenticated,
    isLoading: oidc.isLoading || meLoading,
    isAdmin: me?.isAdmin ?? false,
    groups: me?.groups ?? [],
    displayName: me?.displayName ?? oidc.user?.profile.name ?? '',
    userId: me?.userId ?? '',
    token,
    login: () => oidc.signinRedirect(),
    logout: () => oidc.signoutRedirect(),
  };

  return <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>;
};

export const AuthProvider: React.FunctionComponent<React.PropsWithChildren> = (
  props: React.PropsWithChildren,
) => {
  const { children } = props;
  return (
    <OidcAuthProvider {...oidcConfig}>
      <InnerAuthProvider>{children}</InnerAuthProvider>
    </OidcAuthProvider>
  );
};
