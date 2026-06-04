# Infrastructure

This folder contains infrastructure-related files for the ChurchTool Billing Tool.

## Structure

### `/local`
Development environment setup for local development.

- **docker-compose.yml** - Docker Compose configuration for running Azurite (Azure Storage Emulator)
- Azurite provides local emulation of Azure Table Storage, Blob Storage, and Queue Storage

### `/azure` (Planned)
Azure deployment configurations using Infrastructure as Code (IaC).

- Bicep or Terraform files for production deployments
- Azure resource definitions (App Service, Azure Functions, Storage Accounts, etc.)
- Environment-specific configurations

### `/scripts` (Planned)
Helper scripts for infrastructure management.

- Setup scripts for local development
- Deployment automation scripts
- Database migration scripts

## Local Development

To start the local infrastructure (Azurite):

```bash
cd infrastructure/local
docker compose up -d
```

This will start Azurite with the following endpoints:
- **Blob Service**: http://localhost:10000
- **Queue Service**: http://localhost:10001
- **Table Service**: http://localhost:10002

## Prerequisites

- Docker Desktop (for running Azurite locally)
- Azure CLI (for Azure deployments)
- .NET SDK 10.0+ (for backend development)
- Node.js 20+ (for frontend development)

## Connection Strings

For local development, use these connection strings:

```
UseDevelopmentStorage=true
```

or

```
DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;
```

## Notes

- Azurite data is persisted in Docker volumes
- To reset Azurite data, stop and remove the containers and volumes: `docker compose down -v`
