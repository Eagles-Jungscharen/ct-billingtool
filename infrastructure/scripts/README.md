# Infrastructure Scripts

This folder contains helper scripts for infrastructure management and automation.

## Available Scripts

### Infrastructure Deployment
- **`deploy.ps1`** - Deploy Azure infrastructure and generate a local infrastructure file

  Deploys `infrastructure/azure/main.bicep` to a target resource group and writes deployment outputs
  to a local file at repository root. This output file is intended for later frontend/backend
  code deployments.

  **Usage:**
  ```powershell
  .\deploy.ps1 `
      -ResourceGroupName "rg-ct-billingtool" `
      -EnvironmentName "prod" `
      -Location "westeurope" `
      -Prefix "ctbilling"
  ```

  **Usage (environment output file):**
  ```powershell
  .\deploy.ps1 `
      -ResourceGroupName "rg-ct-billingtool" `
      -EnvironmentName "dev" `
      -Location "westeurope" `
      -Prefix "ctbilling" `
      -UseEnvironmentOutputFile
  ```

  **Usage (explicit output file):**
  ```powershell
  .\deploy.ps1 `
      -ResourceGroupName "rg-ct-billingtool" `
      -EnvironmentName "int" `
      -Location "westeurope" `
      -Prefix "ctbilling" `
      -OutputFile "infrastructure.int.local"
  ```

  **Optional parameters:**
  - `-SubscriptionId` - set Azure subscription context before deployment
  - `-EnableCdn` - enable/disable CDN module (default: `$true`)
  - `-FrontendCustomDomain` - optional custom domain for CDN
  - `-DeploymentName` - explicit deployment name
  - `-UseEnvironmentOutputFile` - writes `infrastructure.<environment>.local`
  - `-OutputFile` - explicit output file path (has priority over `-UseEnvironmentOutputFile`)

  **Output file:**
  - default: `infrastructure.local` (repository root)
  - environment mode: `infrastructure.<environment>.local` (for example `infrastructure.dev.local`)
  - Contains deployment metadata and Bicep outputs (function app name/url, storage accounts, frontend URL)

### Code Deployment
- **`deploy-code.ps1`** - Deploy frontend/backend code using infrastructure output file

  Reads infrastructure values from `infrastructure.local` (or another file passed via `-ParameterFile`)
  and deploys code to existing Azure resources.

  **Usage (all):**
  ```powershell
  .\deploy-code.ps1
  ```

  **Usage (specific environment file):**
  ```powershell
  .\deploy-code.ps1 -ParameterFile "infrastructure.dev.local"
  .\deploy-code.ps1 -ParameterFile "infrastructure.int.local"
  .\deploy-code.ps1 -ParameterFile "infrastructure.prod.local"
  ```

  **Usage (target selection):**
  ```powershell
  .\deploy-code.ps1 -Target Frontend
  .\deploy-code.ps1 -Target Backend
  .\deploy-code.ps1 -Target All
  ```

  **Optional parameters:**
  - `-ParameterFile` (Alias: `-InfrastructureFile`) - alternative infra file path
  - `-SkipBuild` - deploy existing artifacts without running build
  - `-FrontendDistPath` - custom frontend dist path
  - `-BackendPath` - custom backend path

### Custom Domain Setup
- **`setup-custom-domains.ps1`** - Configure DNS records for custom domains

  Prepares and optionally creates DNS records needed for custom domains on both frontend (Static Web App) and backend (Azure Functions).

  **Prerequisites:**
  - Azure CLI installed and authenticated (`az login`)
  - Appropriate permissions to read Azure resources
  - If using Azure DNS: permissions to modify DNS Zone records

  **Usage - Manual Mode (Display DNS records):**
  ```powershell
  .\setup-custom-domains.ps1 `
      -ResourceGroupName "rg-ct-billingtool" `
      -FrontendResourceName "swa-ct-billingtool" `
      -BackendResourceName "func-ct-billingtool" `
      -FrontendDomain "billing.feg-effretikon.ch" `
      -BackendDomain "api-billing.feg-effretikon.ch"
  ```

  **Usage - Azure DNS Mode (Automatic creation):**
  ```powershell
  .\setup-custom-domains.ps1 `
      -ResourceGroupName "rg-ct-billingtool" `
      -FrontendResourceName "swa-ct-billingtool" `
      -BackendResourceName "func-ct-billingtool" `
      -FrontendDomain "billing.feg-effretikon.ch" `
      -BackendDomain "api-billing.feg-effretikon.ch" `
      -DnsZoneName "feg-effretikon.ch" `
      -DnsZoneResourceGroup "rg-dns"
  ```

  **What it does:**
  - Retrieves default hostnames from Azure Static Web App and Function App
  - Generates CNAME records for both frontend and backend
  - Generates TXT record for Function App domain verification
  - Either displays records for manual configuration OR automatically creates them in Azure DNS

  **Help:**
  ```powershell
  Get-Help .\setup-custom-domains.ps1 -Full
  ```

## Planned Scripts

### Setup Scripts
- `setup-local.sh` / `setup-local.ps1` - Initialize local development environment
  - Start Azurite
  - Verify prerequisites
  - Create sample data

### Deployment Scripts
- `deploy-dev.sh` / `deploy-dev.ps1` - Deploy to development environment
- `deploy-prod.sh` / `deploy-prod.ps1` - Deploy to production environment

### Maintenance Scripts
- `backup-storage.sh` / `backup-storage.ps1` - Backup Azure Table Storage data
- `restore-storage.sh` / `restore-storage.ps1` - Restore from backup

### Development Utilities
- `seed-data.sh` / `seed-data.ps1` - Populate development database with test data
- `reset-local.sh` / `reset-local.ps1` - Reset local Azurite storage

## Usage

Scripts should be executable and provide help output when run with `--help`:

```bash
./setup-local.sh --help
```

## Cross-Platform Support

Scripts are provided in both bash (`.sh`) and PowerShell (`.ps1`) formats to support:
- macOS and Linux (bash)
- Windows (PowerShell)

## Prerequisites

Before running scripts, ensure you have:
- Docker Desktop (for local development)
- Azure CLI (for Azure operations)
- jq (for JSON processing in bash scripts)
- Appropriate permissions for Azure subscriptions
