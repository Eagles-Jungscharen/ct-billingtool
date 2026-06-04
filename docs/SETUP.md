# Development Setup Guide

This guide will help you set up your local development environment for the ChurchTool Billing Tool.

## Prerequisites

Before you begin, ensure you have the following installed:

### Required

1. **Node.js** (v20 or later)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify: `node --version`

2. **.NET SDK** (v10.0 or later)
   - Download from [dotnet.microsoft.com](https://dotnet.microsoft.com/download)
   - Verify: `dotnet --version`

3. **Azure Functions Core Tools** (v4)
   - Install: `npm install -g azure-functions-core-tools@4`
   - Verify: `func --version`

4. **Docker Desktop** (for Azurite)
   - Download from [docker.com](https://www.docker.com/products/docker-desktop)
   - Verify: `docker --version`

### Optional

- **Visual Studio Code** (recommended IDE)
  - Extensions: Azure Functions, C#, ESLint, Prettier
- **Azure CLI** (for future Azure deployments)
- **Git** (for version control)

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/C_EaglesJungscharen/ct-billingtool.git
cd ct-billingtool
```

### 2. Install Dependencies

Install all npm dependencies for the monorepo:

```bash
npm install
```

This will install dependencies for:
- Root workspace
- Frontend package
- Shared package

Restore .NET dependencies for the backend:

```bash
cd packages/backend
dotnet restore
cd ../..
```

### 3. Configure Environment Variables

#### Frontend Environment

Copy the example environment file and configure it:

```bash
cp packages/frontend/.env.example packages/frontend/.env.local
```

Edit `packages/frontend/.env.local`:

```env
VITE_OIDC_AUTHORITY=https://authentication.feg-effretikon.ch/api/oidc
VITE_OIDC_CLIENT_ID=your-client-id
VITE_OIDC_REDIRECT_URI=http://localhost:5173/auth/callback
VITE_API_BASE_URL=http://localhost:7072
```

#### Backend Environment

Copy the example settings file:

```bash
cp packages/backend/local.settings.json.example packages/backend/local.settings.json
```

Edit `packages/backend/local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "APPLICATIONINSIGHTS_CONNECTION_STRING": "",
    "CHURCHTOOL_URL": "https://your-church.church.tools",
    "OIDC_AUTHORITY_URL": "https://authentication.feg-effretikon.ch/api/oidc",
    "CHURCHTOOL_IDP_STORAGE_CONNECTION_STRING": "UseDevelopmentStorage=true",
    "CHURCHTOOL_IDP_BASE_URL": "https://your-idp-function.azurewebsites.net",
    "CHURCHTOOL_IDP_FUNCTION_KEY": "your-function-key",
    "CHURCHTOOL_ADMIN_GROUP_ID": "your-admin-group-id"
  },
  "Host": {
    "CORS": "http://localhost:5173",
    "CORSCredentials": true
  }
}
```

### 4. Start Azurite (Azure Storage Emulator)

Start the local storage emulator using Docker:

```bash
cd infrastructure/local
docker compose up -d
cd ../..
```

Verify Azurite is running:
- Blob Service: http://localhost:10000
- Queue Service: http://localhost:10001
- Table Service: http://localhost:10002

### 5. Build the Shared Package

Build the shared types package:

```bash
npm run build:shared
```

## Running the Application

You'll need **three terminal windows** (or tabs):

### Terminal 1: Frontend Development Server

```bash
npm run dev:frontend
```

or

```bash
cd packages/frontend
npm run dev
```

The frontend will be available at: http://localhost:5173

### Terminal 2: Backend (Azure Functions)

```bash
npm run dev:backend
```

or

```bash
cd packages/backend
func start
```

The backend will be available at: http://localhost:7072

### Terminal 3: Shared Package Watch Mode (Optional)

If you're making changes to shared types:

```bash
cd packages/shared
npm run watch
```

This will automatically rebuild the shared package when types change.

## Verifying the Setup

1. **Open the frontend**: Navigate to http://localhost:5173
2. **Check backend health**: The frontend should be able to call the backend API
3. **Test authentication**: Try logging in with ChurchTool credentials
4. **Verify storage**: Check that Azurite is receiving data (in Docker logs)

## Common Issues

### Port Already in Use

If ports 5173 or 7072 are already in use:

**Frontend (Vite):**
- Vite will automatically try the next available port
- Or specify a port: `vite --port 3000`

**Backend (Azure Functions):**
- Edit `packages/backend/Properties/launchSettings.json`
- Change `--port 7072` to another port
- Update `VITE_API_BASE_URL` in frontend `.env.local`

### Azurite Connection Issues

If the backend can't connect to Azurite:
1. Ensure Docker is running
2. Check Azurite container status: `docker ps`
3. Restart Azurite: `cd infrastructure/local && docker compose restart`

### Build Errors in Shared Package

If TypeScript compilation fails:
1. Clear the dist folder: `cd packages/shared && npm run clean`
2. Rebuild: `npm run build`
3. If issues persist, delete `node_modules` and reinstall

### Authentication Failures

If OIDC authentication isn't working:
1. Verify `VITE_OIDC_*` variables are correctly set
2. Ensure redirect URIs are registered in ChurchTool
3. Check browser console for OIDC errors
4. Verify backend OIDC configuration matches frontend

## Development Workflow

### Making Changes to Types

1. Edit types in `packages/shared/src/types/`
2. Build shared package: `npm run build:shared` (or use watch mode)
3. Frontend will automatically pick up new types
4. Backend C# DTOs must be manually synchronized

### Adding New npm Packages

**To frontend:**
```bash
npm install <package> --workspace=@ct-billingtool/frontend
```

**To shared:**
```bash
npm install <package> --workspace=@ct-billingtool/shared
```

### Adding New .NET Packages

```bash
cd packages/backend
dotnet add package <PackageName>
```

## Next Steps

- Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand the system design
- Review [API.md](API.md) for backend API documentation
- Explore the codebase in each package

## Troubleshooting

For additional help:
1. Check the [main README](../README.md)
2. Review package-specific README files
3. Check Azure Functions and Vite documentation
4. Create an issue in the repository

## Quick Reference

| Service | Port | URL |
|---------|------|-----|
| Frontend (Vite) | 5173 | http://localhost:5173 |
| Backend (Functions) | 7072 | http://localhost:7072 |
| Azurite Blob | 10000 | http://localhost:10000 |
| Azurite Queue | 10001 | http://localhost:10001 |
| Azurite Table | 10002 | http://localhost:10002 |
