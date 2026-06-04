# Azure Infrastructure (Planned)

This folder will contain Infrastructure as Code (IaC) templates for deploying the ChurchTool Billing Tool to Azure.

## Planned Contents

### Option 1: Bicep Templates
- `main.bicep` - Main deployment template
- `modules/` - Reusable Bicep modules
  - `storage-static-website.bicep` - Frontend hosting (Blob Storage Static Website)
  - `function-app.bicep` - Backend Azure Functions
  - `storage-data.bicep` - Azure Table Storage for data persistence
  - `cdn.bicep` - Azure CDN for custom domain and HTTPS
  - `monitoring.bicep` - Application Insights

### Option 2: Terraform
- `main.tf` - Main Terraform configuration
- `variables.tf` - Input variables
- `outputs.tf` - Output values
- `modules/` - Reusable Terraform modules

## Deployment Strategy

The application consists of:
1. **Frontend** - Azure Blob Storage Static Website (React/Vite)
   - Simple, cost-effective static file hosting
   - No server-side rendering required
2. **Backend** - Azure Functions (.NET 10 Isolated)
   - Serverless API endpoints
   - Consumption or Flex Consumption plan
3. **Storage** - Azure Table Storage for data persistence
   - Invoice profiles, invoices, and related data
4. **CDN** - Azure CDN (optional but recommended)
   - Custom domain support (e.g., billing.feg-effretikon.ch)
   - HTTPS/SSL termination
   - Global content delivery
5. **Authentication** - ChurchTool OIDC provider (external)
   - Frontend handles authentication flow
   - Backend validates tokens
6. **Monitoring** - Application Insights for telemetry
   - Frontend telemetry via JavaScript SDK
   - Backend telemetry built into Functions

## Architecture Notes

### Frontend Hosting Choice: Blob Storage Static Website

**Why Blob Storage over Azure Static Web Apps:**
- ✅ **Simplicity**: No managed Functions integration needed (we have separate Function App)
- ✅ **Cost**: Lower costs for small-scale deployment
- ✅ **Control**: Full control over CDN and caching configuration
- ✅ **Separation**: Clear separation between frontend and backend deployments

**Trade-offs:**
- ⚠️ Custom domain requires Azure CDN (separate resource)
- ⚠️ No built-in CI/CD (use GitHub Actions instead)
- ⚠️ No preview environments (manual staging setup if needed)

### DNS Configuration

For custom domains, two separate DNS records are needed:
- **Frontend**: CNAME to CDN endpoint (e.g., billing.feg-effretikon.ch → CDN)
- **Backend**: CNAME to Function App (e.g., api-billing.feg-effretikon.ch → Function App)

See [setup-custom-domains.ps1](../scripts/setup-custom-domains.ps1) - Note: Script needs to be adapted for CDN instead of Static Web App.

## Future Enhancements

- CI/CD integration with GitHub Actions
  - Separate workflows for frontend (Blob Storage) and backend (Function App)
- Multi-environment support (dev, staging, production)
  - Separate storage accounts per environment
- Automated backup and disaster recovery
- Cost optimization
  - Review CDN tier (Standard Microsoft is cheapest)
  - Consider Azure Front Door for advanced scenarios
- Security hardening
  - Private Endpoints for Function App and Storage
  - VNet integration for backend
  - WAF rules on CDN/Front Door
