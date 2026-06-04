import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  Avatar,
} from '@fluentui/react-components';
import {
  DocumentRegular,
  SettingsRegular,
  PersonRegular,
  SignOutRegular,
} from '@fluentui/react-icons';
import { useAppAuth } from '../hooks/useAppAuth';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    height: '48px',
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundInverted,
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  appTitle: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForegroundInverted,
    textDecoration: 'none',
  },
  nav: {
    display: 'flex',
    gap: '8px',
  },
  navLink: {
    color: tokens.colorNeutralForegroundInverted,
    textDecoration: 'none',
    padding: '4px 8px',
    borderRadius: tokens.borderRadiusMedium,
    fontSize: tokens.fontSizeBase300,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    ':hover': {
      backgroundColor: tokens.colorBrandBackgroundHover,
    },
  },
  main: {
    flex: 1,
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
});

export const PageShell: React.FunctionComponent<React.PropsWithChildren> = (
  props: React.PropsWithChildren,
) => {
  const { children } = props;
  const styles = useStyles();
  const { displayName, isAdmin, logout } = useAppAuth();
  const navigate = useNavigate();

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link to="/invoices" className={styles.appTitle}>
            Billing Tool
          </Link>
          <nav className={styles.nav}>
            <Link to="/invoices" className={styles.navLink}>
              <DocumentRegular />
              <span>Rechnungen</span>
            </Link>
            {isAdmin && (
              <Link to="/admin" className={styles.navLink}>
                <SettingsRegular />
                <span>Admin</span>
              </Link>
            )}
          </nav>
        </div>
        <Menu>
          <MenuTrigger>
            <Button
              appearance="transparent"
              icon={<Avatar name={displayName} size={24} icon={<PersonRegular />} />}
              style={{ color: tokens.colorNeutralForegroundInverted }}
            >
              <Text style={{ color: tokens.colorNeutralForegroundInverted }}>{displayName}</Text>
            </Button>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem icon={<SignOutRegular />} onClick={() => { logout(); navigate('/'); }}>
                Abmelden
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
};
