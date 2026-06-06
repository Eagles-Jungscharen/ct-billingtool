# Deployment Guide

This document outlines the deployment process for the ChurchTool Billing Tool to Azure.

The recommended infrastructure path is the repository script `infrastructure/scripts/deploy.ps1`,
which deploys Bicep resources and writes `infrastructure.local` at repository root for later code deployments.

## Overview

The application will be deployed to Azure with the following components:

- **Frontend**: Azure Blob Storage Static Website
- **Backend**: Azure Functions (Consumption or Flex Consumption plan)
- **Storage**: Azure Storage Account (Table Storage for data)
- **CDN**: Azure CDN (for custom domain and HTTPS on frontend)
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

### Option 1: Scripted Infrastructure Deployment (Recommended)

Deploy infrastructure from repository root:

```powershell
./infrastructure/scripts/deploy.ps1 `
  -ResourceGroupName "rg-ct-billingtool" `
  -EnvironmentName "prod" `
  -Location "westeurope" `
  -Prefix "ctbilling"
```

Result:
- Infrastructure is deployed via `infrastructure/azure/main.bicep`
- `infrastructure.local` is created in repository root
- `infrastructure.local` can be used by later frontend/backend deployment scripts to read resource names and URLs

### Option 2: Manual Deployment via Azure Portal

1. Create resources manually in Azure Portal
2. Deploy frontend and backend using VS Code extensions or CLI
3. Configure environment variables in Azure Portal

### Option 3: Infrastructure as Code (Bicep)

Deploy all resources using Bicep templates:

```bash
cd infrastructure/azure
az deployment group create \
  --resource-group rg-ct-billingtool \
  --template-file main.bicep \
  --parameters environmentName=prod prefix=ctbilling
```

### Option 4: Infrastructure as Code (Terraform)

Deploy using Terraform:

```bash
cd infrastructure/azure
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

### Option 5: CI/CD with GitHub Actions

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

#### Storage Account (Frontend)

Create a separate storage account for frontend static website hosting:

```bash
az storage account create \
  --name stctbillingtoolfrontend \
  --resource-group rg-ct-billingtool \
  --location westeurope \
  --sku Standard_LRS \
  --kind StorageV2 \
  --allow-blob-public-access true
```

Enable static website hosting:

```bash
az storage blob service-properties update \
  --account-name stctbillingtoolfrontend \
  --static-website \
  --index-document index.html \
  --404-document index.html
```

The static website endpoint will be: `https://stctbillingtoolfrontend.z6.web.core.windows.net`

#### Azure CDN (Optional, for Custom Domain)

If you need custom domain and HTTPS:

```bash
# Create CDN profile
az cdn profile create \
  --name cdn-ct-billingtool \
  --resource-group rg-ct-billingtool \
  --sku Standard_Microsoft

# Create CDN endpoint
az cdn endpoint create \
  --name billing-feg-effretikon \
  --profile-name cdn-ct-billingtool \
  --resource-group rg-ct-billingtool \
  --origin stctbillingtoolfrontend.z6.web.core.windows.net \
  --origin-host-header stctbillingtoolfrontend.z6.web.core.windows.net
```

### 2. Configure Environment Variables

If `infrastructure.local` is available from the scripted deployment, reuse its values for
`functionAppName`, `functionAppUrl`, `frontendStorageAccountName`, and frontend URL fields
instead of hardcoding resource names.

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

#### Frontend (Build-time Environment Variables)

Frontend environment variables are compiled into the build at build time. Create `.env.production` in `packages/frontend`:

```env
VITE_OIDC_AUTHORITY=https://authentication.acme.com/api/oidc
VITE_OIDC_CLIENT_ID=your-client-id
VITE_OIDC_REDIRECT_URI=https://billing.acme.com/auth/callback
VITE_API_BASE_URL=https://api-billing.acme.com.ch
```

**Note**: These values are baked into the JavaScript bundle at build time.

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

# Build for production (uses .env.production)
npm run build

# Upload to Blob Storage
az storage blob upload-batch \
  --account-name stctbillingtoolfrontend \
  --source ./dist \
  --destination '$web' \
  --overwrite
```

**Alternative: Using Azure Storage VS Code Extension**
1. Install "Azure Storage" extension in VS Code
2. Right-click on `dist` folder
3. Select "Deploy to Static Website via Azure Storage"

### 4. Configure CORS

Enable CORS on Azure Functions to allow frontend requests:

```bash
# If using CDN with custom domain
az functionapp cors add \
  --name func-ct-billingtool-backend \
  --resource-group rg-ct-billingtool \
  --allowed-origins https://billing.acme.com

# If using direct blob storage URL
az functionapp cors add \
  --name func-ct-billingtool-backend \
  --resource-group rg-ct-billingtool \
  --allowed-origins https://stctbillingtoolfrontend.z6.web.core.windows.net
```

### 5. Configure Custom Domain (Optional)

#### Frontend Custom Domain via CDN

```bash
# Add custom domain to CDN endpoint
az cdn custom-domain create \
  --endpoint-name billing-acme \
  --profile-name cdn-ct-billingtool \
  --resource-group rg-ct-billingtool \
  --name billing-acme-custom \
  --hostname billing.acme.com

# Enable HTTPS
az cdn custom-domain enable-https \
  --endpoint-name billing-acme \
  --profile-name cdn-ct-billingtool \
  --resource-group rg-ct-billingtool \
  --name billing-acme-custom
```

**DNS Configuration Required:**
Create a CNAME record in your DNS:
- Name: `billing`
- Value: `billing-acme.azureedge.net`

#### Backend Custom Domain

```bash
# Add custom domain to Function App
az functionapp config hostname add \
  --webapp-name func-ct-billingtool-backend \
  --resource-group rg-ct-billingtool \
  --hostname api-billing.acme.com

# Enable HTTPS (managed certificate)
az functionapp config ssl bind \
  --name func-ct-billingtool-backend \
  --resource-group rg-ct-billingtool \
  --certificate-thumbprint auto \
  --ssl-type SNI
```

**DNS Configuration Required:**
Create a CNAME record in your DNS:
- Name: `api-billing`
- Value: `func-ct-billingtool-backend.azurewebsites.net`

### 6. Verify Deployment

1. **Frontend URL**: 
   - Direct: `https://stctbillingtoolfrontend.z6.web.core.windows.net`
   - CDN: `https://billing-acme.azureedge.net`
   - Custom domain: `https://billing.acme.com`
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
