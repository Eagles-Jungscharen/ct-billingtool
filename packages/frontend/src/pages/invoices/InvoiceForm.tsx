import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Field,
  Input,
  Select,
  Spinner,
  Divider,
} from '@fluentui/react-components';
import { RichTextEditor } from '../../components/RichTextEditor';
import {
  SaveRegular,
  ArrowLeftRegular,
  AddRegular,
  DeleteRegular,
  DocumentPdfRegular,
} from '@fluentui/react-icons';
import { useRechnung, useCreateRechnung, useUpdateRechnung } from '../../hooks/useInvoices';
import { useRechnungsprofile } from '../../hooks/useInvoiceProfiles';
import { useAppAuth } from '../../hooks/useAppAuth';
import type {
  CreateUpdateRechnungData,
  RechnungStatus,
  RechnungspositionDto,
} from '../../api/types';

const useStyles = makeStyles({
  root: {},
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
  },
  title: {
    fontSize: tokens.fontSizeHero700,
    fontWeight: tokens.fontWeightSemibold,
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: '12px',
    display: 'block',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  gridThree: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '16px',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
    marginTop: '24px',
  },
  positionActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
  },
  total: {
    textAlign: 'right',
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    marginTop: '12px',
    color: tokens.colorNeutralForeground1,
  },
});

const emptyPosition = (): RechnungspositionDto => ({
  id: crypto.randomUUID(),
  nummer: 1,
  titel: '',
  beschreibung: '',
  einheit: 'Stk.',
  anzahl: 1,
  preisProEinheit: 0,
  preisTotal: 0,
});

const formatCHF = (amount: number) =>
  new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(amount);

export const InvoiceForm: React.FunctionComponent = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  useAppAuth();

  const { data: existing, isLoading: loadingRechnung } = useRechnung(id ?? '');
  const { data: profile } = useRechnungsprofile();
  const createRechnung = useCreateRechnung();
  const updateRechnung = useUpdateRechnung();

  const [form, setForm] = useState<CreateUpdateRechnungData>({
    rechnungsprofilId: '',
    rechnungsnummer: '',
    titel: '',
    beschreibung: '',
    status: 'entwurf',
    rechnungsDatum: new Date().toISOString().split('T')[0],
    empfaengerName: '',
    empfaengerStrasse: '',
    empfaengerHausnummer: '',
    empfaengerPlz: '',
    empfaengerOrt: '',
    positionen: [emptyPosition()],
  });

  useEffect(() => {
    if (existing) {
      setForm({
        rechnungsprofilId: existing.rechnungsprofilId,
        rechnungsnummer: existing.rechnungsnummer,
        titel: existing.titel,
        beschreibung: existing.beschreibung ?? '',
        status: existing.status,
        rechnungsDatum: existing.rechnungsDatum ?? new Date().toISOString().split('T')[0],
        empfaengerName: existing.empfaengerName,
        empfaengerStrasse: existing.empfaengerStrasse,
        empfaengerHausnummer: existing.empfaengerHausnummer,
        empfaengerPlz: existing.empfaengerPlz,
        empfaengerOrt: existing.empfaengerOrt,
        positionen: existing.positionen,
      });
    }
  }, [existing]);

  const setField = <K extends keyof CreateUpdateRechnungData>(
    key: K,
    value: CreateUpdateRechnungData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updatePosition = (index: number, field: keyof RechnungspositionDto, value: string | number) => {
    setForm((prev) => {
      const positionen = [...prev.positionen];
      const pos = { ...positionen[index], [field]: value };
      if (field === 'anzahl' || field === 'preisProEinheit') {
        pos.preisTotal = pos.anzahl * pos.preisProEinheit;
      }
      positionen[index] = pos;
      return { ...prev, positionen };
    });
  };

  const addPosition = () => {
    setForm((prev) => ({
      ...prev,
      positionen: [
        ...prev.positionen,
        { ...emptyPosition(), nummer: prev.positionen.length + 1 },
      ],
    }));
  };

  const removePosition = (index: number) => {
    setForm((prev) => ({
      ...prev,
      positionen: prev.positionen
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, nummer: i + 1 })),
    }));
  };

  const total = form.positionen.reduce((sum, p) => sum + p.preisTotal, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNew) {
      const created = await createRechnung.mutateAsync(form);
      navigate(`/invoices/${created.id}`);
    } else {
      await updateRechnung.mutateAsync({ id: id!, data: form });
    }
  };

  if (!isNew && loadingRechnung) {
    return <Spinner label="Rechnung wird geladen…" />;
  }

  const isSaving = createRechnung.isPending || updateRechnung.isPending;

  return (
    <form onSubmit={handleSubmit} className={styles.root}>
      <div className={styles.header}>
        <Button
          appearance="subtle"
          icon={<ArrowLeftRegular />}
          onClick={() => navigate('/invoices')}
        />
        <Text as="h1" className={styles.title}>
          {isNew ? 'Neue Rechnung' : `Rechnung ${form.rechnungsnummer}`}
        </Text>
        {!isNew && (
          <Button
            appearance="subtle"
            icon={<DocumentPdfRegular />}
            onClick={() => navigate(`/invoices/${id}/pdf`)}
          >
            PDF
          </Button>
        )}
      </div>

      {/* Stammdaten */}
      <div className={styles.section}>
        <Text className={styles.sectionTitle}>Stammdaten</Text>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
          <Field label="Rechnungsnummer" required>
            <Input
              value={form.rechnungsnummer}
              onChange={(_, d) => setField('rechnungsnummer', d.value)}
              required
            />
          </Field>
          <Field label="Rechnungsdatum" required>
            <Input
              type="date"
              value={form.rechnungsDatum ?? ''}
              onChange={(_, d) => setField('rechnungsDatum', d.value)}
              required
            />
          </Field>
          <Field label="Rechnungsprofil (Absender)" required>
            <Select
              value={form.rechnungsprofilId}
              onChange={(_, d) => setField('rechnungsprofilId', d.value)}
              required
            >
              <option value="" disabled>Profil wählen…</option>
              {profile?.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(_, d) => setField('status', d.value as RechnungStatus)}
            >
              <option value="entwurf">Entwurf</option>
              <option value="gesendet">Gesendet</option>
              <option value="bezahlt">Bezahlt</option>
            </Select>
          </Field>
        </div>
        <div style={{ marginTop: '16px' }}>
          <Field label="Titel" required>
            <Input
              value={form.titel}
              onChange={(_, d) => setField('titel', d.value)}
              required
            />
          </Field>
        </div>
        <div style={{ marginTop: '16px' }}>
          <Field label="Beschreibung">
            <RichTextEditor
              value={form.beschreibung ?? ''}
              onChange={(html) => setField('beschreibung', html)}
            />
          </Field>
        </div>
      </div>

      <Divider />

      {/* Empfänger */}
      <div className={styles.section} style={{ marginTop: '24px' }}>
        <Text className={styles.sectionTitle}>Empfänger</Text>
        <div className={styles.grid}>
          <Field label="Name" required>
            <Input
              value={form.empfaengerName}
              onChange={(_, d) => setField('empfaengerName', d.value)}
              required
            />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '8px' }}>
            <Field label="Strasse" required>
              <Input
                value={form.empfaengerStrasse}
                onChange={(_, d) => setField('empfaengerStrasse', d.value)}
                required
              />
            </Field>
            <Field label="Nr." required>
              <Input
                value={form.empfaengerHausnummer}
                onChange={(_, d) => setField('empfaengerHausnummer', d.value)}
                required
              />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '8px' }}>
            <Field label="PLZ" required>
              <Input
                value={form.empfaengerPlz}
                onChange={(_, d) => setField('empfaengerPlz', d.value)}
                required
              />
            </Field>
            <Field label="Ort" required>
              <Input
                value={form.empfaengerOrt}
                onChange={(_, d) => setField('empfaengerOrt', d.value)}
                required
              />
            </Field>
          </div>
        </div>
      </div>

      <Divider />

      {/* Positionen */}
      <div className={styles.section} style={{ marginTop: '24px' }}>
        <Text className={styles.sectionTitle}>Positionen</Text>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: tokens.fontSizeBase300 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${tokens.colorNeutralStroke1}`, textAlign: 'left' }}>
              <th style={{ padding: '6px 4px', width: '40px' }}>Nr.</th>
              <th style={{ padding: '6px 4px' }}>Titel</th>
              <th style={{ padding: '6px 4px', width: '90px' }}>Einheit</th>
              <th style={{ padding: '6px 4px', width: '80px' }}>Anz.</th>
              <th style={{ padding: '6px 4px', width: '130px' }}>Preis/Einheit</th>
              <th style={{ padding: '6px 4px', width: '110px', textAlign: 'right' }}>Total</th>
              <th style={{ padding: '6px 4px', width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {form.positionen.map((pos, index) => (
              <tr key={pos.id} style={{ borderBottom: `1px solid ${tokens.colorNeutralStroke2}` }}>
                <td style={{ padding: '4px' }}>{pos.nummer}</td>
                <td style={{ padding: '4px' }}>
                  <Input size="small" value={pos.titel} onChange={(_, d) => updatePosition(index, 'titel', d.value)} />
                </td>
                <td style={{ padding: '4px' }}>
                  <Input size="small" value={pos.einheit} onChange={(_, d) => updatePosition(index, 'einheit', d.value)} />
                </td>
                <td style={{ padding: '4px' }}>
                  <Input size="small" type="number" value={String(pos.anzahl)} onChange={(_, d) => updatePosition(index, 'anzahl', Number(d.value))} />
                </td>
                <td style={{ padding: '4px' }}>
                  <Input size="small" type="number" value={String(pos.preisProEinheit)} contentBefore={<span>CHF</span>} onChange={(_, d) => updatePosition(index, 'preisProEinheit', Number(d.value))} />
                </td>
                <td style={{ padding: '4px', textAlign: 'right' }}>{formatCHF(pos.preisTotal)}</td>
                <td style={{ padding: '4px' }}>
                  <Button
                    appearance="subtle"
                    size="small"
                    icon={<DeleteRegular />}
                    onClick={() => removePosition(index)}
                    disabled={form.positionen.length <= 1}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.positionActions}>
          <Button appearance="subtle" icon={<AddRegular />} onClick={addPosition}>
            Position hinzufügen
          </Button>
        </div>

        <div className={styles.total}>
          Gesamt: {formatCHF(total)}
        </div>
      </div>

      <div className={styles.actions}>
        <Button appearance="secondary" onClick={() => navigate('/invoices')}>
          Abbrechen
        </Button>
        <Button
          appearance="primary"
          type="submit"
          icon={<SaveRegular />}
          disabled={isSaving}
        >
          {isSaving ? 'Speichern…' : 'Speichern'}
        </Button>
      </div>
    </form>
  );
};
