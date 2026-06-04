import React from 'react';
import { useNavigate } from 'react-router-dom';
import { makeStyles, tokens, Text, Button } from '@fluentui/react-components';
import { LockClosedRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '16px',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  icon: {
    fontSize: '48px',
    color: tokens.colorPaletteRedForeground1,
  },
  title: {
    fontSize: tokens.fontSizeHero700,
    fontWeight: tokens.fontWeightSemibold,
  },
  subtitle: {
    color: tokens.colorNeutralForeground2,
  },
});

export const Unauthorized: React.FunctionComponent = () => {
  const styles = useStyles();
  const navigate = useNavigate();

  return (
    <div className={styles.root}>
      <LockClosedRegular className={styles.icon} />
      <Text as="h1" className={styles.title}>Kein Zugriff</Text>
      <Text className={styles.subtitle}>Du hast keine Berechtigung für diesen Bereich.</Text>
      <Button appearance="primary" onClick={() => navigate('/invoices')}>
        Zurück zur Übersicht
      </Button>
    </div>
  );
};
