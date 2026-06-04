# Deployment Guide

This document outlines the deployment process for the ChurchTool Billing Tool to Azure.

> ⚠️ **Note**: This is a planned deployment guide. The actual deployment process will be finalized as part of future work.

## Overview

The application will be deployed to Azure with the following components:

- **Frontend**: Azure Static Web Apps or Azure App Service
- **Backend**: Azure Functions (Consumption or Premium plan)
- **Storage**: Azure Storage Account (Table Storage)
- **Monitoring**: Application Insights
- **Authentication**: ChurchTool IDP (external service)

## Prerequisites

Before deploying, ensure you have:

1. **Azure Subscription**: Active Azure subscription with appropriate permissions
2. **Azure CLI**: Installed and authenticated (`az login`)
3. **Azure Functions Core Tools**: Version 4 (`func --version`)
4. **Node.js**: Version 20+ for building frontend
5. **.NET SDK**: Version 10.0+ for building backend
6. **Resource Group**: Created in desired Azure region

## Deployment Options

### Option 1: Manual Deployment via Azure Portal

1. Create resources manually in Azure Portal
2. Deploy frontend and backend using VS Code extensions or CLI
3. Configure environment variables in Azure Portal

### Option 2: Infrastructure as Code (Bicep)

Deploy all resources using Bicep templates:

```bash
cd infrastructure/azure
az deployment group create \
  --resource-group rg-ct-billingtool \
  --template-file main.bicep \
  --parameters environment=production
```

### Option 3: Infrastructure as Code (Terraform)

Deploy using Terraform:

```bash
cd infrastructure/azure
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

### Option 4: CI/CD with GitHub Actions

Automated deployment triggered by pushes to main branch.

## Step-by-Step Manual Deployment

### 1. Create Azure Resources

#### Storage Account

```bash
az storage account create \
  --name stctbillingtool \
  --resource-group rg-ct-billingtool \
  --location westeurope \
  --sku Standard_LRS \
  --kind StorageV2
```

#### Application Insights

```bash
az monitor app-insights component create \
  --app ct-billingtool-insights \
  --resource-group rg-ct-billingtool \
  --location westeurope
```

#### Azure Functions (Backend)

```bash
az functionapp create \
  --name func-ct-billingtool-backend \
  --resource-group rg-ct-billingtool \
  --storage-account stctbillingtool \
  --consumption-plan-location westeurope \
  --runtime dotnet-isolated \
  --runtime-version 10 \
  --functions-version 4 \
  --app-insights ct-billingtool-insights \
  --os-type Linux
```

#### Static Web App (Frontend)

```bash
az staticwebapp create \
  --name swa-ct-billingtool-frontend \
  --resource-group rg-ct-billingtool \
  --location westeurope \
  --source https://github.com/C_EaglesJungscharen/ct-billingtool \
  --branch main \
  --app-location "/packages/frontend" \
  --api-location "" \
  --output-location "dist"
```

### 2. Configure Environment Variables

#### Backend (Azure Functions)

Set application settings:

```bash
# Connection strings
az functionapp config appsettings set \
  --name func-ct-billingtool-backend \
  --resource-group rg-ct-billingtool \
  --settings \
    "AzureWebJobsStorage=<storage-connection-string>" \
    "FUNCTIONS_WORKER_RUNTIME=dotnet-isolated" \
    "APPLICATIONINSIGHTS_CONNECTION_STRING=<app-insights-connection>" \
    "CHURCHTOOL_URL=<churchtool-url>" \
    "OIDC_AUTHORITY_URL=<oidc-authority>" \
    "CHURCHTOOL_IDP_STORAGE_CONNECTION_STRING=<storage-connection-string>" \
    "CHURCHTOOL_IDP_BASE_URL=<idp-base-url>" \
    "CHURCHTOOL_IDP_FUNCTION_KEY=<function-key>" \
    "CHURCHTOOL_ADMIN_GROUP_ID=<admin-group-id>"
```

#### Frontend (Static Web App)

Configure environment variables in Azure Portal or via API:

```bash
az staticwebapp appsettings set \
  --name swa-ct-billingtool-frontend \
  --resource-group rg-ct-billingtool \
  --setting-names \
    "VITE_OIDC_AUTHORITY=<oidc-authority>" \
    "VITE_OIDC_CLIENT_ID=<client-id>" \
    "VITE_OIDC_REDIRECT_URI=<redirect-uri>" \
    "VITE_API_BASE_URL=<backend-url>"
```

### 3. Build and Deploy

#### Backend Deployment

```bash
# From monorepo root
cd packages/backend

# Build for production
dotnet publish -c Release -o ./publish

# Deploy to Azure Functions
func azure functionapp publish func-ct-billingtool-backend
```

#### Frontend Deployment

```bash
# From monorepo root
cd packages/frontend

# Build for production
npm run build

# Deploy to Static Web App (automatic via GitHub Actions)
# Or manual deploy:
az staticwebapp upload \
  --name swa-ct-billingtool-frontend \
  --resource-group rg-ct-billingtool \
  --source ./dist
```

### 4. Configure CORS

Enable CORS on Azure Functions to allow frontend requests:

```bash
az functionapp cors add \
  --name func-ct-billingtool-backend \
  --resource-group rg-ct-billingtool \
  --allowed-origins https://swa-ct-billingtool-frontend.azurestaticapps.net
```

### 5. Verify Deployment

1. Access frontend URL: `https://swa-ct-billingtool-frontend.azurestaticapps.net`
2. Test authentication flow
3. Verify API calls to backend
4. Check Application Insights for telemetry

## CI/CD with GitHub Actions

### Workflow Files

Create workflow files in `.github/workflows/`:

#### `ci.yml` - Continuous Integration

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build:shared
      - run: npm run build:frontend
      - run: npm run lint:frontend

  build-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-dotnet@v3
        with:
          dotnet-version: '10.0.x'
      - run: cd packages/backend && dotnet restore
      - run: cd packages/backend && dotnet build -c Release
```

#### `deploy-frontend.yml` - Frontend Deployment

```yaml
name: Deploy Frontend

on:
  push:
    branches: [ main ]
    paths:
      - 'packages/frontend/**'
      - 'packages/shared/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build:shared
      - run: npm run build:frontend
      - name: Deploy to Azure Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/packages/frontend"
          output_location: "dist"
```

#### `deploy-backend.yml` - Backend Deployment

```yaml
name: Deploy Backend

on:
  push:
    branches: [ main ]
    paths:
      - 'packages/backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-dotnet@v3
        with:
          dotnet-version: '10.0.x'
      - name: Build
        run: |
          cd packages/backend
          dotnet restore
          dotnet publish -c Release -o ./output
      - name: Deploy to Azure Functions
        uses: Azure/functions-action@v1
        with:
          app-name: func-ct-billingtool-backend
          package: packages/backend/output
          publish-profile: ${{ secrets.AZURE_FUNCTIONAPP_PUBLISH_PROFILE }}
```

### Required Secrets

Configure these secrets in GitHub repository settings:

| Secret Name | Description |
|-------------|-------------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Static Web Apps deployment token |
| `AZURE_FUNCTIONAPP_PUBLISH_PROFILE` | Functions app publish profile |

## Monitoring and Maintenance

### Application Insights

Monitor application health via Application Insights:

- **Metrics**: Request rates, response times, failure rates
- **Logs**: Application logs and traces
- **Alerts**: Configure alerts for anomalies
- **Dashboard**: Create custom dashboard for key metrics

### Health Checks

Implement health check endpoints:

- **Backend**: `/api/health` - Check backend and dependencies
- **Frontend**: Static asset availability

### Backup and Recovery

- **Table Storage**: Regular exports to Blob Storage
- **Configuration**: Store in Azure Key Vault
- **Code**: Git repository is source of truth

### Scaling

#### Backend (Azure Functions)

- **Consumption Plan**: Scales automatically (0-200 instances)
- **Premium Plan**: Pre-warmed instances, VNet integration
- **Dedicated Plan**: App Service plan for predictable costs

#### Frontend (Static Web App)

- Scales automatically via Azure CDN
- Global distribution of static assets

### Cost Optimization

- **Functions**: Use Consumption plan for variable load
- **Storage**: Use appropriate access tiers
- **Monitoring**: Set log retention periods
- **Reserved Instances**: Consider for predictable workloads

## Rollback Strategy

In case of deployment issues:

1. **Frontend**: Revert to previous deployment via Azure Portal
2. **Backend**: Redeploy previous version or use deployment slots
3. **Configuration**: Restore from version control
4. **Data**: Restore from Table Storage backup

## Security Checklist

- [ ] HTTPS enforced on all endpoints
- [ ] CORS configured correctly
- [ ] Environment variables stored securely (Key Vault)
- [ ] Managed identities for Azure resources
- [ ] Network security groups configured
- [ ] Application Insights log filtering (no PII)
- [ ] Regular security updates applied

## Troubleshooting

### Common Issues

**Issue**: Frontend can't connect to backend

- Check CORS configuration
- Verify API URL in frontend configuration
- Check network security rules

**Issue**: Authentication failures

- Verify OIDC configuration
- Check redirect URIs in ChurchTool
- Inspect JWT token claims

**Issue**: Table Storage connection errors

- Verify connection string
- Check storage account firewall rules
- Verify managed identity permissions

## Next Steps

- [ ] Finalize Azure resource naming convention
- [ ] Create IaC templates (Bicep or Terraform)
- [ ] Set up GitHub Actions workflows
- [ ] Configure Application Insights alerts
- [ ] Implement backup strategy
- [ ] Document production environment variables
- [ ] Create runbook for common operations

## Further Reading

- [Azure Functions Deployment](https://learn.microsoft.com/azure/azure-functions/functions-deployment-technologies)
- [Azure Static Web Apps](https://learn.microsoft.com/azure/static-web-apps/)
- [Azure Table Storage](https://learn.microsoft.com/azure/storage/tables/)
- [Application Insights](https://learn.microsoft.com/azure/azure-monitor/app/app-insights-overview)
