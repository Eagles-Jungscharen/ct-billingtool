import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Spinner,
} from '@fluentui/react-components';
import { ArrowLeftRegular, ArrowDownloadRegular } from '@fluentui/react-icons';
import {
  Document,
  Page,
  PDFViewer,
  PDFDownloadLink,
  StyleSheet,
  View,
  Text as PdfText,
} from '@react-pdf/renderer';
import { useRechnung } from '../../hooks/useInvoices';
import { useRechnungsprofile } from '../../hooks/useInvoiceProfiles';
import type { RechnungDto, RechnungsprofilDto } from '../../api/types';

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
    flex: 1,
  },
  viewer: {
    width: '100%',
    height: '80vh',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
  },
});

const pdfStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  absender: {
    fontSize: 9,
    color: '#666',
    lineHeight: 1.5,
  },
  rechnungsnummer: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  rechnungsMeta: {
    fontSize: 9,
    color: '#666',
  },
  empfaenger: {
    marginBottom: 32,
  },
  empfaengerLabel: {
    fontSize: 8,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  empfaengerText: {
    lineHeight: 1.5,
  },
  titel: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  beschreibung: {
    fontSize: 10,
    color: '#444',
    marginBottom: 24,
  },
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    padding: '6 4',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    padding: '5 4',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  colNr: { width: '6%' },
  colTitel: { width: '34%' },
  colEinheit: { width: '12%' },
  colAnzahl: { width: '10%', textAlign: 'right' },
  colPreis: { width: '18%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  totalLabel: {
    fontFamily: 'Helvetica-Bold',
    marginRight: 16,
  },
  totalValue: {
    fontFamily: 'Helvetica-Bold',
    width: '20%',
    textAlign: 'right',
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderTopColor: '#ccc',
    paddingTop: 8,
    fontSize: 8,
    color: '#888',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

const formatCHF = (amount: number) =>
  new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(amount);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('de-CH');

const stripHtml = (html: string): string =>
  html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

interface PdfDocProps {
  rechnung: RechnungDto
  profil: RechnungsprofilDto | undefined
}

const InvoicePdfDocument: React.FunctionComponent<PdfDocProps> = ({ rechnung, profil }: PdfDocProps) => {
  const total = rechnung.positionen.reduce((sum, p) => sum + p.preisTotal, 0);

  return (
    <Document title={`Rechnung ${rechnung.rechnungsnummer}`}>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.header}>
          <View style={pdfStyles.absender}>
            {profil && (
              <>
                <PdfText style={{ fontFamily: 'Helvetica-Bold', fontSize: 11 }}>{profil.absenderName}</PdfText>
                <PdfText>{profil.strasse} {profil.hausnummer}</PdfText>
                <PdfText>{profil.plz} {profil.ort}</PdfText>
                <PdfText> </PdfText>
                <PdfText>IBAN: {profil.iban}</PdfText>
              </>
            )}
          </View>
          <View>
            <PdfText style={pdfStyles.rechnungsnummer}>Rechnung {rechnung.rechnungsnummer}</PdfText>
            <PdfText style={pdfStyles.rechnungsMeta}>Datum: {rechnung.rechnungsDatum ? formatDate(rechnung.rechnungsDatum) : formatDate(rechnung.createdAt)}</PdfText>
          </View>
        </View>

        {/* Empfänger */}
        <View style={pdfStyles.empfaenger}>
          <PdfText style={pdfStyles.empfaengerLabel}>An</PdfText>
          <View style={pdfStyles.empfaengerText}>
            <PdfText>{rechnung.empfaengerName}</PdfText>
            <PdfText>{rechnung.empfaengerStrasse} {rechnung.empfaengerHausnummer}</PdfText>
            <PdfText>{rechnung.empfaengerPlz} {rechnung.empfaengerOrt}</PdfText>
          </View>
        </View>

        {/* Titel & Beschreibung */}
        <PdfText style={pdfStyles.titel}>{rechnung.titel}</PdfText>
        {rechnung.beschreibung && (
          <PdfText style={pdfStyles.beschreibung}>{stripHtml(rechnung.beschreibung)}</PdfText>
        )}

        {/* Tabelle */}
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <PdfText style={pdfStyles.colNr}>Nr.</PdfText>
            <PdfText style={pdfStyles.colTitel}>Titel</PdfText>
            <PdfText style={pdfStyles.colEinheit}>Einheit</PdfText>
            <PdfText style={pdfStyles.colAnzahl}>Anz.</PdfText>
            <PdfText style={pdfStyles.colPreis}>Preis/Einheit</PdfText>
            <PdfText style={pdfStyles.colTotal}>Total</PdfText>
          </View>
          {rechnung.positionen.map((pos) => (
            <View key={pos.id} style={pdfStyles.tableRow}>
              <PdfText style={pdfStyles.colNr}>{pos.nummer}</PdfText>
              <PdfText style={pdfStyles.colTitel}>{pos.titel}{pos.beschreibung ? `\n${pos.beschreibung}` : ''}</PdfText>
              <PdfText style={pdfStyles.colEinheit}>{pos.einheit}</PdfText>
              <PdfText style={pdfStyles.colAnzahl}>{pos.anzahl}</PdfText>
              <PdfText style={pdfStyles.colPreis}>{formatCHF(pos.preisProEinheit)}</PdfText>
              <PdfText style={pdfStyles.colTotal}>{formatCHF(pos.preisTotal)}</PdfText>
            </View>
          ))}
        </View>

        {/* Total */}
        <View style={pdfStyles.totalRow}>
          <PdfText style={pdfStyles.totalLabel}>Gesamtbetrag</PdfText>
          <PdfText style={pdfStyles.totalValue}>{formatCHF(total)}</PdfText>
        </View>

        {/* Footer */}
        <View style={pdfStyles.footer} fixed>
          <PdfText>{profil?.absenderName ?? ''}</PdfText>
          <PdfText>IBAN: {profil?.iban ?? ''}</PdfText>
          <PdfText>Rechnung {rechnung.rechnungsnummer}</PdfText>
        </View>
      </Page>
    </Document>
  );
};

export const InvoicePdfPreview: React.FunctionComponent = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: rechnung, isLoading: loadingRechnung } = useRechnung(id ?? '');
  const { data: profile, isLoading: loadingProfiles } = useRechnungsprofile();

  const profil = profile?.find((p) => p.id === rechnung?.rechnungsprofilId);

  if (loadingRechnung || loadingProfiles) {
    return <Spinner label="Wird geladen…" />;
  }

  if (!rechnung) {
    return <Text>Rechnung nicht gefunden.</Text>;
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Button
          appearance="subtle"
          icon={<ArrowLeftRegular />}
          onClick={() => navigate(`/invoices/${id}`)}
        />
        <Text as="h1" className={styles.title}>
          Rechnung {rechnung.rechnungsnummer} – PDF
        </Text>
        <PDFDownloadLink
          document={<InvoicePdfDocument rechnung={rechnung} profil={profil} />}
          fileName={`Rechnung_${rechnung.rechnungsnummer}.pdf`}
        >
          {({ loading }) => (
            <Button
              appearance="primary"
              icon={<ArrowDownloadRegular />}
              disabled={loading}
            >
              {loading ? 'Wird vorbereitet…' : 'Herunterladen'}
            </Button>
          )}
        </PDFDownloadLink>
      </div>

      <PDFViewer className={styles.viewer}>
        <InvoicePdfDocument rechnung={rechnung} profil={profil} />
      </PDFViewer>
    </div>
  );
};
