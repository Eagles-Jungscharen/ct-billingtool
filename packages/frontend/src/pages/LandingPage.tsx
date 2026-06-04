import React from 'react';
import { makeStyles, tokens, Text, Button } from '@fluentui/react-components';
import { DocumentTextRegular } from '@fluentui/react-icons';
import { useAppAuth } from '../hooks/useAppAuth';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '24px',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  icon: {
    fontSize: '64px',
    color: tokens.colorBrandForeground1,
  },
  title: {
    fontSize: tokens.fontSizeHero900,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  subtitle: {
    fontSize: tokens.fontSizeBase400,
    color: tokens.colorNeutralForeground2,
    textAlign: 'center',
    maxWidth: '480px',
  },
});

export const LandingPage: React.FunctionComponent = () => {
  const styles = useStyles();
  const { login } = useAppAuth();

  return (
    <div className={styles.root}>
      <DocumentTextRegular className={styles.icon} />
      <Text as="h1" className={styles.title}>Billing Tool</Text>
      <Text className={styles.subtitle}>
        Erstelle und verwalte deine Rechnungen – einfach, schnell und als PDF exportierbar.
      </Text>
      <Button appearance="primary" size="large" onClick={login}>
        Anmelden
      </Button>
    </div>
  );
};
