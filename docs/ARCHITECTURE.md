# System Architecture

This document describes the architecture of the ChurchTool Billing Tool monorepo.

## Overview

The ChurchTool Billing Tool is a web-based invoice management system integrated with ChurchTool for authentication. It consists of a React frontend, a .NET Azure Functions backend, and uses Azure Table Storage for data persistence.

## Monorepo Structure

```
ct-billingtool/
├── packages/
│   ├── frontend/         # React + Vite frontend application
│   ├── backend/          # .NET Azure Functions backend API
│   └── shared/           # Shared TypeScript types (DTOs)
├── infrastructure/       # IaC, Docker Compose, deployment scripts
├── docs/                # Project documentation
├── .github/             # CI/CD workflows (GitHub Actions)
├── package.json         # Root workspace configuration
└── README.md            # Project overview
```

### Package Management

The monorepo uses **npm workspaces** to manage multiple packages:

- **Root workspace**: Orchestrates scripts across all packages
- **Frontend workspace** (`@ct-billingtool/frontend`): React application
- **Shared workspace** (`@ct-billingtool/shared`): Common TypeScript types

The backend is a .NET project managed separately with `dotnet` CLI.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
│                     (User Interface)                        │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTPS
                 │
┌────────────────▼────────────────────────────────────────────┐
│                   Frontend (React + Vite)                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ • Pages: Landing, Invoice List/Form, Admin          │    │
│  │ • Components: RichTextEditor, StatusBadge           │    │
│  │ • Auth: OIDC (react-oidc-context)                   │    │
│  │ • State: TanStack Query                             │    │
│  │ • PDF: @react-pdf/renderer                          │    │
│  └─────────────────────────────────────────────────────┘    │
│              Port: 5173 (development)                       │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTP/JSON + Bearer Token
                 │
┌────────────────▼──────────────────────────────────────────┐
│          Backend (Azure Functions - .NET 10)              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Functions:                                          │  │
│  │   • MeFunction - GET /api/me                        │  │
│  │   • InvoiceProfilesFunction - GET /api/invoice-     │  │
│  │     profiles                                        │  │
│  │   • InvoicesFunction - CRUD /api/invoices           │  │
│  │   • InvoiceManagementFunction - Admin endpoints     │  │
│  │                                                     │  │
│  │ Services:                                           │  │
│  │   • MeService - User info from ChurchTool           │  │
│  │   • InvoiceProfileService - Profile management      │  │
│  │   • InvoiceService - Invoice CRUD operations        │  │
│  │                                                     │  │
│  │ Middleware:                                         │  │
│  │   • JwtValidationMiddleware                         │  │
│  │   • ChurchToolReferenceMiddleware                   │  │
│  └─────────────────────────────────────────────────────┘  │
│              Port: 7072 (development)                     │
└────┬───────────────────────┬────────────────────────────┬─┘
     │                       │                            │
     │ JWT Validation        │ Data Persistence           │ User Info
     │                       │                            │
┌────▼────────────┐  ┌───────▼──────────────┐  ┌──────────▼──────────┐
│ ChurchTool IDP  │  │ Azure Table Storage  │  │   ChurchTool API    │
│   (External)    │  │     (Azurite)        │  │     (External)      │
│                 │  │                      │  │                     │
│ • OIDC Auth     │  │ Tables:              │  │ • User Details      │
│ • JWT Tokens    │  │   • BillingProfiles  │  │ • Group Membership  │
│                 │  │   • Invoices         │  │                     │
└─────────────────┘  │   • InvoicePositions │  └─────────────────────┘
                     │                      │
                     │Local: localhost:10002│
                     └──────────────────────┘
```

## Technology Stack

### Frontend (`packages/frontend`)

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.6 | UI framework |
| TypeScript | 6.0.2 | Type-safe JavaScript |
| Vite | 8.0.12 | Build tool & dev server |
| Fluent UI | 9.74.1 | Microsoft design system |
| React Router | 7.16.0 | Client-side routing |
| TanStack Query | 5.101.0 | Server state management |
| react-oidc-context | 3.3.1 | OIDC authentication |
| @react-pdf/renderer | 4.5.1 | PDF generation |
| Tiptap | 3.25.0 | Rich text editor |

**Build Output**: Static files (HTML, JS, CSS) served by web server

### Backend (`packages/backend`)

| Technology | Version | Purpose |
|------------|---------|---------|
| .NET | 10.0 | Runtime framework |
| Azure Functions | v4 | Serverless compute |
| Worker Model | Isolated | Process isolation |
| Azure Table Storage | - | NoSQL data storage |
| JWT Bearer Auth | - | Token validation |
| Application Insights | 2.23.0 | Telemetry & monitoring |

**Deployment**: Azure Functions (consumption or dedicated plan)

### Shared (`packages/shared`)

| Technology | Version | Purpose |
|------------|---------|---------|
| TypeScript | 6.0.2 | Type definitions |

**Purpose**: Single source of truth for DTOs shared between frontend and backend

## Data Flow

### 1. Authentication Flow

```
User → Frontend → ChurchTool IDP (OIDC)
                        ↓
                   JWT Token
                        ↓
Frontend stores token → Sends with API requests
                        ↓
Backend validates JWT → Fetches user info from ChurchTool
                        ↓
                  Checks admin status
                        ↓
                Returns user details
```

### 2. Invoice Creation Flow

```
User fills form → Frontend validates → POST /api/invoices with JWT
                                              ↓
                          Backend validates token & user
                                              ↓
                          Creates RechnungEntity in Table Storage
                                              ↓
                          Creates RechnungspositionEntity for each line item
                                              ↓
                          Returns RechnungDto to frontend
                                              ↓
                          Frontend updates UI & cache
```

### 3. Admin Operations Flow

```
Admin user → Frontend checks isAdmin flag
                    ↓
            Renders admin menu
                    ↓
Admin action → POST /api/invoice-management/* with JWT
                    ↓
         Backend validates JWT
                    ↓
         Checks ChurchTool group membership
                    ↓
         If admin → Perform operation
                    ↓
         If not → Return 403 Forbidden
```

## Data Models

### Core Entities

#### MeDto
```typescript
{
  userId: string
  displayName: string
  isAdmin: boolean
  groups: GroupDto[]
}
```

#### RechnungsprofilDto (Invoice Profile)
```typescript
{
  id: string
  name: string
  iban: string
  absenderName: string
  strasse: string
  hausnummer: string
  plz: string
  ort: string
}
```

#### RechnungDto (Invoice)
```typescript
{
  id: string
  userId: string
  rechnungsprofilId: string
  rechnungsnummer: string
  titel: string
  beschreibung?: string
  status: 'entwurf' | 'gesendet' | 'bezahlt'
  rechnungsDatum?: string
  empfaengerName: string
  empfaengerStrasse: string
  empfaengerHausnummer: string
  empfaengerPlz: string
  empfaengerOrt: string
  positionen: RechnungspositionDto[]
  createdAt: string
  updatedAt: string
}
```

#### RechnungspositionDto (Invoice Line Item)
```typescript
{
  id: string
  nummer: number
  titel: string
  beschreibung?: string
  einheit: string
  anzahl: number
  preisProEinheit: number
  preisTotal: number
}
```

### Storage Schema

**Azure Table Storage** is used for all data persistence:

| Table Name | Partition Key | Row Key | Purpose |
|------------|--------------|---------|---------|
| BillingProfiles | "profile" | `{id}` | Invoice profiles (sender info) |
| Invoices | `{userId}` | `{id}` | User's invoices |
| InvoicePositions | `{invoiceId}` | `{id}` | Invoice line items |

## Security

### Authentication & Authorization

1. **OIDC (OpenID Connect)**: ChurchTool IDP provides authentication
2. **JWT Tokens**: Bearer tokens included in API requests
3. **Token Validation**: Backend validates JWT signature and claims
4. **Role-Based Access**: Admin operations require ChurchTool group membership
5. **User Isolation**: Users can only access their own invoices (except admins)

### Security Measures

- CORS configured to allow only frontend origin
- HTTPS in production (TLS/SSL)
- Secure storage of environment variables
- No sensitive data in client-side code
- Input validation on both frontend and backend
- SQL injection prevention (NoSQL storage)

## Deployment Architecture

### Development

- **Frontend**: Vite dev server (localhost:5173)
- **Backend**: Azure Functions Core Tools (localhost:7072)
- **Storage**: Azurite (Docker container)
- **Auth**: ChurchTool IDP (external)

### Production (Planned)

- **Frontend**: Azure Static Web Apps or Azure App Service
- **Backend**: Azure Functions (Consumption or Premium plan)
- **Storage**: Azure Storage Account (Table Storage)
- **Auth**: ChurchTool IDP (external)
- **Monitoring**: Application Insights
- **CDN**: Azure CDN for static assets
- **SSL**: Managed certificates

## Scalability Considerations

### Current Limitations

- Single-region deployment
- No caching layer
- Synchronous operations
- Table Storage query limitations

### Future Enhancements

- **Caching**: Redis for session data and frequent queries
- **CDN**: Static asset distribution
- **Multi-region**: Active-active or active-passive setup
- **Message Queue**: Async processing for heavy operations
- **Database**: Consider Azure Cosmos DB for complex queries
- **API Gateway**: Azure API Management for rate limiting

## Development Workflow

### Type Synchronization

**Challenge**: Keep TypeScript types in `shared` package synchronized with C# DTOs in backend.

**Current Approach**:
1. C# DTOs are the source of truth
2. TypeScript types are manually created to match
3. Developers must ensure consistency

**Future Improvement**:
- Consider using code generators (e.g., NSwag, Kiota)
- Or use JSON Schema as single source of truth

### Build Process

```
Root: npm install
  ↓
Shared: npm run build
  ↓
Frontend: npm run build (depends on shared)
  ↓
Backend: dotnet build
  ↓
All packages built ✓
```

## Monorepo Benefits

1. **Type Safety**: Shared types ensure frontend-backend consistency
2. **Atomic Changes**: Update API and UI in single commit
3. **Simplified Dependency Management**: Centralized package versions
4. **Consistent Tooling**: Unified linting, formatting, testing
5. **Documentation**: All docs in one place
6. **CI/CD**: Single pipeline for entire application

## Further Reading

- [SETUP.md](SETUP.md) - Development environment setup
- [API.md](API.md) - Backend API reference
- [Frontend README](../packages/frontend/README.md)
- [Backend README](../packages/backend/README.md)
- [Shared Types README](../packages/shared/README.md)
