# Infrastructure Scripts (Planned)

This folder will contain helper scripts for infrastructure management and automation.

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
