import React, { useState } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  DataGrid,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridBody,
  DataGridRow,
  DataGridCell,
  type TableColumnDefinition,
  createTableColumn,
  Spinner,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogContent,
  DialogActions,
  Text,
} from '@fluentui/react-components';
import { EditRegular, DeleteRegular } from '@fluentui/react-icons';
import { useAdminRechnungsprofile, useDeleteRechnungsprofil } from '../../hooks/useAdminInvoiceProfiles';
import { InvoiceProfileForm } from './InvoiceProfileForm';
import type { RechnungsprofilDto } from '../../api/types';

const useStyles = makeStyles({
  root: {
    marginTop: '16px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px',
    color: tokens.colorNeutralForeground2,
  },
});

interface Props {
  onNew: () => void
}

export const InvoiceProfileList: React.FunctionComponent<Props> = (_props: Props) => {
  const styles = useStyles();
  const { data: profiles, isLoading } = useAdminRechnungsprofile();
  const deleteProfile = useDeleteRechnungsprofil();
  const [editTarget, setEditTarget] = useState<RechnungsprofilDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RechnungsprofilDto | null>(null);

  const columns: TableColumnDefinition<RechnungsprofilDto>[] = [
    createTableColumn<RechnungsprofilDto>({
      columnId: 'name',
      compare: (a, b) => a.name.localeCompare(b.name),
      renderHeaderCell: () => 'Name',
      renderCell: (item) => item.name,
    }),
    createTableColumn<RechnungsprofilDto>({
      columnId: 'absenderName',
      renderHeaderCell: () => 'Absender',
      renderCell: (item) => item.absenderName,
    }),
    createTableColumn<RechnungsprofilDto>({
      columnId: 'adresse',
      renderHeaderCell: () => 'Adresse',
      renderCell: (item) => `${item.strasse} ${item.hausnummer}, ${item.plz} ${item.ort}`,
    }),
    createTableColumn<RechnungsprofilDto>({
      columnId: 'iban',
      renderHeaderCell: () => 'IBAN',
      renderCell: (item) => item.iban,
    }),
    createTableColumn<RechnungsprofilDto>({
      columnId: 'actions',
      renderHeaderCell: () => '',
      renderCell: (item) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button
            appearance="subtle"
            size="small"
            icon={<EditRegular />}
            onClick={() => setEditTarget(item)}
          />
          <Button
            appearance="subtle"
            size="small"
            icon={<DeleteRegular />}
            onClick={() => setDeleteTarget(item)}
          />
        </div>
      ),
    }),
  ];

  if (isLoading) {
    return <Spinner label="Profile werden geladen…" />;
  }

  return (
    <div className={styles.root}>
      {!profiles?.length ? (
        <div className={styles.emptyState}>
          <Text>Noch keine Rechnungsprofile vorhanden.</Text>
        </div>
      ) : (
        <DataGrid items={profiles} columns={columns} sortable getRowId={(item) => item.id}>
          <DataGridHeader>
            <DataGridRow>
              {({ renderHeaderCell }) => (
                <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
              )}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<RechnungsprofilDto>>
            {({ item, rowId }) => (
              <DataGridRow<RechnungsprofilDto> key={rowId}>
                {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      )}

      {editTarget && (
        <InvoiceProfileForm
          existing={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(_, data) => { if (!data.open) setDeleteTarget(null); }}
      >
        <DialogTrigger disableButtonEnhancement>
          <span />
        </DialogTrigger>
        <DialogSurface>
          <DialogTitle>Profil löschen</DialogTitle>
          <DialogContent>
            Möchtest du das Profil <strong>{deleteTarget?.name}</strong> wirklich löschen?
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={() => setDeleteTarget(null)}>
              Abbrechen
            </Button>
            <Button
              appearance="primary"
              onClick={async () => {
                if (deleteTarget) {
                  await deleteProfile.mutateAsync(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
            >
              Löschen
            </Button>
          </DialogActions>
        </DialogSurface>
      </Dialog>
    </div>
  );
};
