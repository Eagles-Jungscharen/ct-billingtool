@description('Deployment location.')
param location string

@description('Name of the Azure Function App.')
@minLength(2)
@maxLength(60)
param functionAppName string

@description('Application Insights connection string for telemetry.')
param appInsightsConnectionString string

@description('ChurchTools base URL used for JWT and API calls.')
param churchToolUrl string

@description('OIDC authority URL for token validation.')
param oidcAuthorityUrl string

@description('Storage connection string used by the ChurchTool IDP integration.')
@secure()
param churchToolIdpStorageConnectionString string

@description('Base URL of the ChurchTool IDP Functions endpoint.')
param churchToolIdpBaseUrl string

@description('Function key for ChurchTool IDP Functions endpoint.')
@secure()
param churchToolIdpFunctionKey string

@description('ChurchTool group id that grants admin access.')
param churchToolAdminGroupId string

@description('Optional QR bill function base URL. Leave empty to disable QR bill generation calls.')
param qrBillFunctionBaseUrl string = ''

@description('Optional QR bill function key. Leave empty to disable QR bill generation calls.')
@secure()
param qrBillFunctionKey string = ''

@description('Blob container name for QR bill files.')
param qrBillContainerName string = 'invoice-qrbills'

@description('Storage connection string for QR bill blobs. Uses runtime storage when omitted.')
@secure()
param qrBillStorageConnectionString string = ''

@description('Tags applied to these resources.')
param tags object = {}

@description('Storage account name for function app runtime.')
@minLength(3)
@maxLength(24)
param runtimeStorageAccountName string

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

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: runtimeStorageAccount
  name: 'default'
}

// Pflicht-Container fuer Flex Consumption Deployment-Pakete
resource deploymentContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'function-releases'
  properties: {
    publicAccess: 'None'
  }
}

resource hostingPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  tags: tags
  sku: {
    name: 'FC1'
    tier: 'FlexConsumption'
  }
  kind: 'functionapp,linux'
  properties: {
    reserved: true
  }
}

var runtimeStorageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=${runtimeStorageAccount.name};AccountKey=${runtimeStorageAccount.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: functionAppName
  location: location
  tags: tags
  kind: 'functionapp,linux'
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
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsightsConnectionString
        }
        {
          name: 'CHURCHTOOL_URL'
          value: churchToolUrl
        }
        {
          name: 'OIDC_AUTHORITY_URL'
          value: oidcAuthorityUrl
        }
        {
          name: 'CHURCHTOOL_IDP_STORAGE_CONNECTION_STRING'
          value: churchToolIdpStorageConnectionString
        }
        {
          name: 'CHURCHTOOL_IDP_BASE_URL'
          value: churchToolIdpBaseUrl
        }
        {
          name: 'CHURCHTOOL_IDP_FUNCTION_KEY'
          value: churchToolIdpFunctionKey
        }
        {
          name: 'CHURCHTOOL_ADMIN_GROUP_ID'
          value: churchToolAdminGroupId
        }
        {
          name: 'QR_BILL_FUNCTION_BASE_URL'
          value: qrBillFunctionBaseUrl
        }
        {
          name: 'QR_BILL_FUNCTION_KEY'
          value: qrBillFunctionKey
        }
      ]
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: true
    }
    functionAppConfig: {
      deployment: {
        storage: {
          type: 'blobContainer'
          value: '${runtimeStorageAccount.properties.primaryEndpoints.blob}function-releases'
          authentication: {
            type: 'StorageAccountConnectionString'
            storageAccountConnectionStringName: 'AzureWebJobsStorage'
          }
        }
      }
      scaleAndConcurrency: {
        maximumInstanceCount: 100
        instanceMemoryMB: 2048
      }
      runtime: {
        name: 'dotnet-isolated'
        version: '10.0'
      }
    }
  }
}

output functionAppName string = functionApp.name
output defaultHostName string = functionApp.properties.defaultHostName
output managedIdentityPrincipalId string = functionApp.identity.principalId
output runtimeStorageAccountName string = runtimeStorageAccount.name
