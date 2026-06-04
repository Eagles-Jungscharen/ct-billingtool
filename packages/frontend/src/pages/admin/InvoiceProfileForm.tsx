import React, { useState } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Field,
  Input,
  makeStyles,
} from '@fluentui/react-components';
import {
  useCreateRechnungsprofil,
  useUpdateRechnungsprofil,
} from '../../hooks/useAdminInvoiceProfiles';
import type { CreateUpdateRechnungsprofilData, RechnungsprofilDto } from '../../api/types';

const useStyles = makeStyles({
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginTop: '8px',
  },
  fullWidth: {
    gridColumn: '1 / -1',
  },
});

interface Props {
  existing?: RechnungsprofilDto
  onClose: () => void
}

export const InvoiceProfileForm: React.FunctionComponent<Props> = ({ existing, onClose }: Props) => {
  const styles = useStyles();
  const createProfile = useCreateRechnungsprofil();
  const updateProfile = useUpdateRechnungsprofil();

  const [form, setForm] = useState<CreateUpdateRechnungsprofilData>({
    name: existing?.name ?? '',
    iban: existing?.iban ?? '',
    absenderName: existing?.absenderName ?? '',
    strasse: existing?.strasse ?? '',
    hausnummer: existing?.hausnummer ?? '',
    plz: existing?.plz ?? '',
    ort: existing?.ort ?? '',
  });

  const setField = <K extends keyof CreateUpdateRechnungsprofilData>(
    key: K,
    value: CreateUpdateRechnungsprofilData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (existing) {
      await updateProfile.mutateAsync({ id: existing.id, data: form });
    } else {
      await createProfile.mutateAsync(form);
    }
    onClose();
  };

  const isSaving = createProfile.isPending || updateProfile.isPending;

  return (
    <Dialog open onOpenChange={(_, data) => { if (!data.open) onClose(); }}>
      <DialogSurface>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{existing ? 'Profil bearbeiten' : 'Neues Rechnungsprofil'}</DialogTitle>
          <DialogContent>
            <div className={styles.grid}>
              <Field label="Profilname" required className={styles.fullWidth}>
                <Input
                  value={form.name}
                  onChange={(_, d) => setField('name', d.value)}
                  placeholder="z. B. Hauptprofil"
                  required
                />
              </Field>
              <Field label="Absender (Name)" required className={styles.fullWidth}>
                <Input
                  value={form.absenderName}
                  onChange={(_, d) => setField('absenderName', d.value)}
                  required
                />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '8px' }} className={styles.fullWidth}>
                <Field label="Strasse" required>
                  <Input
                    value={form.strasse}
                    onChange={(_, d) => setField('strasse', d.value)}
                    required
                  />
                </Field>
                <Field label="Nr." required>
                  <Input
                    value={form.hausnummer}
                    onChange={(_, d) => setField('hausnummer', d.value)}
                    required
                  />
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '8px' }} className={styles.fullWidth}>
                <Field label="PLZ" required>
                  <Input
                    value={form.plz}
                    onChange={(_, d) => setField('plz', d.value)}
                    required
                  />
                </Field>
                <Field label="Ort" required>
                  <Input
                    value={form.ort}
                    onChange={(_, d) => setField('ort', d.value)}
                    required
                  />
                </Field>
              </div>
              <Field label="IBAN" required className={styles.fullWidth}>
                <Input
                  value={form.iban}
                  onChange={(_, d) => setField('iban', d.value)}
                  placeholder="CH56 0483 5012 3456 7800 9"
                  required
                />
              </Field>
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>Abbrechen</Button>
            <Button appearance="primary" type="submit" disabled={isSaving}>
              {isSaving ? 'Speichern…' : 'Speichern'}
            </Button>
          </DialogActions>
        </form>
      </DialogSurface>
    </Dialog>
  );
};
