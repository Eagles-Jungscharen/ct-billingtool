// Re-export all types from the shared package
// This ensures type consistency between frontend and backend
export type {
  MeDto,
  GroupDto,
  RechnungsprofilDto,
  RechnungspositionDto,
  RechnungDto,
  RechnungStatus,
  CreateUpdateRechnungsprofilData,
  CreateUpdateRechnungData,
  ApiError,
} from '@ct-billingtool/shared';

