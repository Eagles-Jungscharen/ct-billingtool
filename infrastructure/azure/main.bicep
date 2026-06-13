targetScope = 'resourceGroup'

@description('Deployment location for all resources.')
param location string = resourceGroup().location

@description('Environment name, e.g. dev, staging, prod.')
param environmentName string = 'prod'

@description('Short project prefix used for generated resource names.')
param prefix string = 'ctbilling'

@description('Tags applied to all resources.')
param tags object = {}

@description('Optional explicit name for frontend storage account. Leave empty to auto-generate.')
@maxLength(24)
param frontendStorageAccountName string = ''

@description('Optional explicit name for data storage account. Leave empty to auto-generate.')
@maxLength(24)
param dataStorageAccountName string = ''

@description('Optional explicit name for function app. Leave empty to auto-generate.')
@maxLength(60)
param functionAppName string = ''

@description('Enable CDN for frontend custom domain and edge caching.')
param enableCdn bool = true

@description('Optional explicit CDN profile name. Leave empty to auto-generate.')
param cdnProfileName string = ''

@description('Optional explicit CDN endpoint name. Leave empty to auto-generate.')
param cdnEndpointName string = ''

@description('Optional custom frontend domain for CDN, e.g. billing.example.org.')
param frontendCustomDomain string = ''

@description('Optional explicit Application Insights name. Leave empty to auto-generate.')
param appInsightsName string = ''

@description('Optional explicit Log Analytics Workspace name. Leave empty to auto-generate.')
param logAnalyticsWorkspaceName string = ''

@description('ChurchTools base URL used by the backend.')
param churchToolUrl string

@description('OIDC authority URL for JWT validation in backend.')
param oidcAuthorityUrl string

@description('Storage connection string used by ChurchTool IDP integration.')
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

var frontendStorageName = empty(frontendStorageAccountName)
  ? toLower(take('${prefix}${environmentName}web${uniqueString(resourceGroup().id)}', 24))
  : toLower(frontendStorageAccountName)

var dataStorageName = empty(dataStorageAccountName)
  ? toLower(take('${prefix}${environmentName}data${uniqueString(subscription().id, resourceGroup().name)}', 24))
  : toLower(dataStorageAccountName)

var appInsightsResourceName = empty(appInsightsName)
  ? take('${prefix}-${environmentName}-appi', 260)
  : appInsightsName

var logAnalyticsName = empty(logAnalyticsWorkspaceName)
  ? take('${prefix}-${environmentName}-law', 63)
  : logAnalyticsWorkspaceName

var generatedFunctionAppName = toLower(take('${prefix}-${environmentName}-func-${uniqueString(resourceGroup().id)}', 60))
var finalFunctionAppName = empty(functionAppName) ? generatedFunctionAppName : toLower(functionAppName)

var generatedCdnProfileName = toLower(take('${prefix}-${environmentName}-cdn-${uniqueString(resourceGroup().id)}', 50))
var generatedCdnEndpointName = toLower(take('${prefix}-${environmentName}-web-${uniqueString(resourceGroup().id)}', 50))
var finalCdnProfileName = empty(cdnProfileName) ? generatedCdnProfileName : toLower(cdnProfileName)
var finalCdnEndpointName = empty(cdnEndpointName) ? generatedCdnEndpointName : toLower(cdnEndpointName)

module storageStaticWebsite './modules/storage-static-website.bicep' = {
  name: 'storage-static-website-${environmentName}'
  params: {
    location: location
    storageAccountName: frontendStorageName
    tags: tags
  }
}

module monitoring './modules/monitoring.bicep' = {
  name: 'monitoring-${environmentName}'
  params: {
    location: location
    appInsightsName: appInsightsResourceName
    logAnalyticsWorkspaceName: logAnalyticsName
    tags: tags
  }
}

module functionApp './modules/function-app.bicep' = {
  name: 'function-app-${environmentName}'
  params: {
    location: location
    functionAppName: finalFunctionAppName
    appInsightsConnectionString: monitoring.outputs.appInsightsConnectionString
    churchToolUrl: churchToolUrl
    oidcAuthorityUrl: oidcAuthorityUrl
    churchToolIdpStorageConnectionString: churchToolIdpStorageConnectionString
    churchToolIdpBaseUrl: churchToolIdpBaseUrl
    churchToolIdpFunctionKey: churchToolIdpFunctionKey
    churchToolAdminGroupId: churchToolAdminGroupId
    qrBillFunctionBaseUrl: qrBillFunctionBaseUrl
    qrBillFunctionKey: qrBillFunctionKey
    runtimeStorageAccountName: dataStorageName
    tags: tags
  }
}

module cdn './modules/cdn.bicep' = if (enableCdn) {
  name: 'cdn-${environmentName}'
  params: {
    location: location
    cdnProfileName: finalCdnProfileName
    endpointName: finalCdnEndpointName
    originHostName: storageStaticWebsite.outputs.webHostName
    customDomainName: frontendCustomDomain
    tags: tags
  }
}

output frontendStorageAccountName string = storageStaticWebsite.outputs.storageAccountName
output frontendWebsiteUrl string = storageStaticWebsite.outputs.primaryWebEndpoint
output dataStorageAccountName string = functionApp.outputs.runtimeStorageAccountName
output functionAppName string = functionApp.outputs.functionAppName
output functionAppUrl string = 'https://${functionApp.outputs.defaultHostName}'
output applicationInsightsName string = monitoring.outputs.appInsightsName
output cdnEndpointHostName string = enableCdn ? cdn!.outputs.endpointHostName : ''
