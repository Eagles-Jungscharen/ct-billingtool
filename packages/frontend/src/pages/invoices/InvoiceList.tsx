import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  makeStyles,
  tokens,
  Text,
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
} from '@fluentui/react-components';
import {
  AddRegular,
  EditRegular,
  DeleteRegular,
  DocumentPdfRegular,
} from '@fluentui/react-icons';
import { InvoiceStatusBadge } from '../../components/InvoiceStatusBadge';
import { useRechnungen, useDeleteRechnung } from '../../hooks/useInvoices';
import type { RechnungDto } from '../../api/types';

const useStyles = makeStyles({
  root: {},
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: '24px',
  },
  title: {
    fontSize: tokens.fontSizeHero700,
    fontWeight: tokens.fontWeightSemibold,
  },
  subtitle: {
    color: tokens.colorNeutralForeground2,
    display: 'block',
    marginTop: '4px',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px',
    color: tokens.colorNeutralForeground2,
  },
});

const formatCHF = (amount: number) =>
  new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(amount);

const calcTotal = (rechnung: RechnungDto) =>
  rechnung.positionen.reduce((sum, p) => sum + p.preisTotal, 0);

export const InvoiceList: React.FunctionComponent = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const { data: rechnungen, isLoading } = useRechnungen();
  const deleteRechnung = useDeleteRechnung();
  const [deleteTarget, setDeleteTarget] = useState<RechnungDto | null>(null);

  const columns: TableColumnDefinition<RechnungDto>[] = [
    createTableColumn<RechnungDto>({
      columnId: 'rechnungsnummer',
      compare: (a, b) => a.rechnungsnummer.localeCompare(b.rechnungsnummer),
      renderHeaderCell: () => 'Nr.',
      renderCell: (item) => item.rechnungsnummer,
    }),
    createTableColumn<RechnungDto>({
      columnId: 'rechnungsDatum',
      compare: (a, b) => (a.rechnungsDatum ?? '').localeCompare(b.rechnungsDatum ?? ''),
      renderHeaderCell: () => 'Datum',
      renderCell: (item) =>
        item.rechnungsDatum
          ? new Date(item.rechnungsDatum).toLocaleDateString('de-CH')
          : '—',
    }),
    createTableColumn<RechnungDto>({
      columnId: 'titel',
      compare: (a, b) => a.titel.localeCompare(b.titel),
      renderHeaderCell: () => 'Titel',
      renderCell: (item) => item.titel,
    }),
    createTableColumn<RechnungDto>({
      columnId: 'empfaenger',
      renderHeaderCell: () => 'Empfänger',
      renderCell: (item) => item.empfaengerName,
    }),
    createTableColumn<RechnungDto>({
      columnId: 'total',
      renderHeaderCell: () => 'Total',
      renderCell: (item) => formatCHF(calcTotal(item)),
    }),
    createTableColumn<RechnungDto>({
      columnId: 'status',
      renderHeaderCell: () => 'Status',
      renderCell: (item) => <InvoiceStatusBadge status={item.status} />,
    }),
    createTableColumn<RechnungDto>({
      columnId: 'actions',
      renderHeaderCell: () => '',
      renderCell: (item) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button
            appearance="subtle"
            size="small"
            icon={<EditRegular />}
            onClick={() => navigate(`/invoices/${item.id}`)}
          />
          <Button
            appearance="subtle"
            size="small"
            icon={<DocumentPdfRegular />}
            onClick={() => navigate(`/invoices/${item.id}/pdf`)}
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
    return <Spinner label="Rechnungen werden geladen…" />;
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div>
          <Text as="h1" className={styles.title}>Meine Rechnungen</Text>
          <Text className={styles.subtitle}>
            {rechnungen?.length ?? 0} Rechnung{rechnungen?.length !== 1 ? 'en' : ''}
          </Text>
        </div>
        <div className={styles.actions}>
          <Button
            appearance="primary"
            icon={<AddRegular />}
            onClick={() => navigate('/invoices/new')}
          >
            Neue Rechnung
          </Button>
        </div>
      </div>

      {!rechnungen?.length ? (
        <div className={styles.emptyState}>
          <Text>Noch keine Rechnungen vorhanden. Erstelle deine erste Rechnung!</Text>
        </div>
      ) : (
        <DataGrid items={rechnungen} columns={columns} sortable getRowId={(item) => item.id}>
          <DataGridHeader>
            <DataGridRow>
              {({ renderHeaderCell }) => (
                <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
              )}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<RechnungDto>>
            {({ item, rowId }) => (
              <DataGridRow<RechnungDto> key={rowId}>
                {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      )}

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(_, data) => { if (!data.open) setDeleteTarget(null); }}
      >
        <DialogTrigger disableButtonEnhancement>
          <span />
        </DialogTrigger>
        <DialogSurface>
          <DialogTitle>Rechnung löschen</DialogTitle>
          <DialogContent>
            Möchtest du die Rechnung <strong>{deleteTarget?.rechnungsnummer}</strong> wirklich löschen?
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={() => setDeleteTarget(null)}>
              Abbrechen
            </Button>
            <Button
              appearance="primary"
              onClick={async () => {
                if (deleteTarget) {
                  await deleteRechnung.mutateAsync(deleteTarget.id);
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
