import type {
  CreateUpdateRechnungRequest,
  CreateUpdateRechnungsprofilRequest,
  ErrorRecord,
  GroupDto,
  MeDto,
  RechnungDto as GeneratedRechnungDto,
  RechnungspositionDto,
  RechnungsprofilDto,
} from '../generated/dtos.js';

export type {
  CreateUpdateRechnungRequest,
  CreateUpdateRechnungsprofilRequest,
  ErrorRecord,
  GroupDto,
  MeDto,
  RechnungspositionDto,
  RechnungsprofilDto,
};

export type RechnungStatus = 'entwurf' | 'gesendet' | 'bezahlt';

export type RechnungDto = Omit<GeneratedRechnungDto, 'status'> & {
  status: RechnungStatus;
};

export type CreateUpdateRechnungsprofilData = CreateUpdateRechnungsprofilRequest;

export type CreateUpdateRechnungData = Omit<
  RechnungDto,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
>;

export interface ApiError {
  status: number;
  message: string;
}

