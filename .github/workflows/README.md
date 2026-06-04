# Deployment Workflows (Placeholders)

This directory contains GitHub Actions workflows for CI/CD.

## Current Workflows

### `ci.yml` - Continuous Integration

Runs on every push and pull request to `main` and `develop` branches.

**Jobs:**
1. **build-shared**: Builds the shared types package
2. **build-frontend**: Lints and builds the frontend (depends on shared)
3. **build-backend**: Builds the .NET backend
4. **test**: Runs tests (placeholder for future implementation)

**Triggers:**
- Push to `main` or `develop`
- Pull requests targeting `main` or `develop`

## Planned Workflows

### `deploy-frontend.yml` - Frontend Deployment

Will deploy the frontend to Azure Static Web Apps or Azure App Service.

**Triggers:**
- Push to `main` (production)
- Manual workflow dispatch

### `deploy-backend.yml` - Backend Deployment

Will deploy the backend to Azure Functions.

**Triggers:**
- Push to `main` (production)
- Manual workflow dispatch

## Required Secrets

For deployment workflows (to be configured):

| Secret Name | Description |
|-------------|-------------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Deployment token for Static Web Apps |
| `AZURE_FUNCTIONAPP_PUBLISH_PROFILE` | Publish profile for Azure Functions |
| `AZURE_CREDENTIALS` | Azure service principal credentials (alternative) |

## Setup Instructions

1. **Create Azure Resources**: See [docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md)
2. **Configure Secrets**: Add secrets in GitHub repository settings
3. **Enable Workflows**: Workflows run automatically on push/PR
4. **Manual Deployment**: Use "Run workflow" button in GitHub Actions tab

## Local Testing

Test workflows locally with [act](https://github.com/nektos/act):

```bash
# Install act
brew install act  # macOS

# Run CI workflow locally
act push

# Run specific job
act -j build-frontend
```

## Badge

Add this badge to your README.md:

```markdown
[![CI](https://github.com/C_EaglesJungscharen/ct-billingtool/actions/workflows/ci.yml/badge.svg)](https://github.com/C_EaglesJungscharen/ct-billingtool/actions/workflows/ci.yml)
```

## Further Reading

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Azure Static Web Apps Deploy Action](https://github.com/Azure/static-web-apps-deploy)
- [Azure Functions Deploy Action](https://github.com/Azure/functions-action)
