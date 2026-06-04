# Azure Infrastructure (Planned)

This folder will contain Infrastructure as Code (IaC) templates for deploying the ChurchTool Billing Tool to Azure.

## Planned Contents

### Option 1: Bicep Templates
- `main.bicep` - Main deployment template
- `modules/` - Reusable Bicep modules
  - `app-service.bicep` - Frontend hosting
  - `function-app.bicep` - Backend Azure Functions
  - `storage.bicep` - Storage accounts
  - `monitoring.bicep` - Application Insights

### Option 2: Terraform
- `main.tf` - Main Terraform configuration
- `variables.tf` - Input variables
- `outputs.tf` - Output values
- `modules/` - Reusable Terraform modules

## Deployment Strategy

The application consists of:
1. **Frontend** - Static Web App or App Service (React/Vite)
2. **Backend** - Azure Functions (.NET 10 Isolated)
3. **Storage** - Azure Table Storage for data persistence
4. **Authentication** - Integrated with ChurchTool OIDC provider
5. **Monitoring** - Application Insights for telemetry

## Future Enhancements

- CI/CD integration with GitHub Actions
- Multi-environment support (dev, staging, production)
- Automated backup and disaster recovery
- Cost optimization with reserved instances
- Security hardening with Private Endpoints and VNets
