@description('Deployment location.')
param location string

@description('Storage account name for static website hosting.')
@minLength(3)
@maxLength(24)
param storageAccountName string

@description('Tags applied to this resource.')
param tags object = {}

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: true
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2021-09-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    deleteRetentionPolicy: {
      enabled: true
      days: 7
    }
    containerDeleteRetentionPolicy: {
      enabled: true
      days: 7
    }
    cors: {
      corsRules: []
    }
    isVersioningEnabled: false
  }
}

var webEndpoint = storageAccount.properties.primaryEndpoints.web
var webHostName = replace(replace(webEndpoint, 'https://', ''), '/', '')

output storageAccountName string = storageAccount.name
output primaryWebEndpoint string = webEndpoint
output webHostName string = webHostName
