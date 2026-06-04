# @ct-billingtool/shared

Shared TypeScript types and utilities for the ChurchTool Billing Tool monorepo.

## Purpose

This package contains:
- Common DTOs (Data Transfer Objects) used by both frontend and backend
- Shared utility functions (if needed)
- Type definitions to ensure type safety across the monorepo

## Usage

In other packages, import shared types like this:

```typescript
import { MeDto, RechnungDto, RechnungsprofilDto } from '@ct-billingtool/shared';
```

## Development

```bash
# Build the package
npm run build

# Watch mode (auto-rebuild on changes)
npm run watch

# Clean build artifacts
npm run clean
```

## Adding New Types

1. Add your type definition in `src/types/`
2. Export it from `src/types/index.ts`
3. Run `npm run build` to generate declaration files
4. The type will be available to other packages after installing dependencies

## Note

This package is private and not published to npm. It's only used within the monorepo via npm workspaces.
