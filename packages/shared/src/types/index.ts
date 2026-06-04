// ============================================
// Core DTOs (Data Transfer Objects)
// These types match the C# DTOs from the backend
// ============================================

/**
 * User information with admin status and groups
 */
export interface MeDto {
  userId: string;
  displayName: string;
  isAdmin: boolean;
  groups: GroupDto[];
}

/**
 * ChurchTool group information
 */
export interface GroupDto {
  id: string;
  title: string;
}

/**
 * Invoice profile (Rechnungsprofil) - sender information for invoices
 */
export interface RechnungsprofilDto {
  id: string;
  name: string;
  iban: string;
  absenderName: string;
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: string;
}

/**
 * Invoice line item (Rechnungsposition)
 */
export interface RechnungspositionDto {
  id: string;
  nummer: number;
  titel: string;
  beschreibung?: string;
  einheit: string;
  anzahl: number;
  preisProEinheit: number;
  preisTotal: number;
}

/**
 * Invoice status
 */
export type RechnungStatus = 'entwurf' | 'gesendet' | 'bezahlt';

/**
 * Invoice (Rechnung) with all details
 */
export interface RechnungDto {
  id: string;
  userId: string;
  rechnungsprofilId: string;
  rechnungsnummer: string;
  titel: string;
  beschreibung?: string;
  status: RechnungStatus;
  rechnungsDatum?: string;
  empfaengerName: string;
  empfaengerStrasse: string;
  empfaengerHausnummer: string;
  empfaengerPlz: string;
  empfaengerOrt: string;
  positionen: RechnungspositionDto[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Request Types
// ============================================

/**
 * Data for creating or updating an invoice profile
 */
export type CreateUpdateRechnungsprofilData = Omit<RechnungsprofilDto, 'id'>;

/**
 * Data for creating or updating an invoice
 */
export type CreateUpdateRechnungData = Omit<RechnungDto, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

// ============================================
// API Error Types
// ============================================

/**
 * API error response
 */
export interface ApiError {
  status: number;
  message: string;
}

