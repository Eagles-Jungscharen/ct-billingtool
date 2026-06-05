@description('Deployment location.')
param location string

@description('Name of the Azure Function App.')
@minLength(2)
@maxLength(60)
param functionAppName string

@description('Application Insights connection string for telemetry.')
param appInsightsConnectionString string

@description('Connection string to the data storage account (Table Storage).')
param dataStorageConnectionString string

@description('Tags applied to these resources.')
param tags object = {}

var runtimeStorageAccountName = toLower(take('st${uniqueString(functionAppName, resourceGroup().id)}${replace(functionAppName, '-', '')}', 24))
var planName = '${functionAppName}-plan'

resource runtimeStorageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: runtimeStorageAccountName
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource hostingPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  tags: tags
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  kind: 'functionapp'
  properties: {
    reserved: false
  }
}

var runtimeStorageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=${runtimeStorageAccount.name};AccountKey=${runtimeStorageAccount.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: functionAppName
  location: location
  tags: tags
  kind: 'functionapp'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: hostingPlan.id
    httpsOnly: true
    siteConfig: {
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: runtimeStorageConnectionString
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'dotnet-isolated'
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsightsConnectionString
        }
        {
          name: 'APPINSIGHTS_CONNECTIONSTRING'
          value: appInsightsConnectionString
        }
        {
          name: 'BillingTool__Storage__ConnectionString'
          value: dataStorageConnectionString
        }
      ]
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: true
    }
  }
}

output functionAppName string = functionApp.name
output defaultHostName string = functionApp.properties.defaultHostName
output managedIdentityPrincipalId string = functionApp.identity.principalId
