import React, { useState } from 'react';
import {
  Tab,
  TabList,
  makeStyles,
  tokens,
  Text,
  Button,
} from '@fluentui/react-components';
import { BuildingRegular, AddRegular } from '@fluentui/react-icons';
import { InvoiceProfileList } from './InvoiceProfileList';
import { InvoiceProfileForm } from './InvoiceProfileForm';

const useStyles = makeStyles({
  root: {},
  header: {
    marginBottom: '8px',
  },
  title: {
    fontSize: tokens.fontSizeHero700,
    fontWeight: tokens.fontWeightSemibold,
  },
  subtitle: {
    color: tokens.colorNeutralForeground2,
    marginBottom: '24px',
    display: 'block',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '16px',
  },
});

export const AdminDashboard: React.FunctionComponent = () => {
  const styles = useStyles();
  const [tab] = useState<string>('profiles');
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Text as="h1" className={styles.title}>Admin</Text>
        <Text className={styles.subtitle}>
          Rechnungsprofile verwalten – Absender, Adresse und IBAN.
        </Text>
      </div>

      <div className={styles.actions}>
        <Button
          appearance="primary"
          icon={<AddRegular />}
          onClick={() => setFormOpen(true)}
        >
          Neues Profil
        </Button>
      </div>

      <TabList selectedValue={tab}>
        <Tab value="profiles" icon={<BuildingRegular />}>Rechnungsprofile</Tab>
      </TabList>

      {tab === 'profiles' && <InvoiceProfileList onNew={() => setFormOpen(true)} />}

      {formOpen && (
        <InvoiceProfileForm onClose={() => setFormOpen(false)} />
      )}
    </div>
  );
};
