@description('Deployment location for the CDN profile.')
param location string

@description('CDN profile name.')
param cdnProfileName string

@description('CDN endpoint name.')
param endpointName string

@description('Origin host name for static website, without protocol.')
param originHostName string

@description('Optional custom domain to attach to the CDN endpoint.')
param customDomainName string = ''

@description('Tags applied to these resources.')
param tags object = {}

resource cdnProfile 'Microsoft.Cdn/profiles@2023-05-01' = {
  name: cdnProfileName
  location: location
  tags: tags
  sku: {
    name: 'Standard_Microsoft'
  }
}

resource endpoint 'Microsoft.Cdn/profiles/endpoints@2023-05-01' = {
  parent: cdnProfile
  name: endpointName
  location: location
  properties: {
    isHttpAllowed: false
    isHttpsAllowed: true
    originHostHeader: originHostName
    queryStringCachingBehavior: 'IgnoreQueryString'
    origins: [
      {
        name: 'frontend-origin'
        properties: {
          hostName: originHostName
          httpPort: 80
          httpsPort: 443
        }
      }
    ]
  }
}

resource customDomain 'Microsoft.Cdn/profiles/endpoints/customDomains@2023-05-01' = if (!empty(customDomainName)) {
  parent: endpoint
  name: replace(customDomainName, '.', '-')
  properties: {
    hostName: customDomainName
  }
}

output profileName string = cdnProfile.name
output endpointName string = endpoint.name
output endpointHostName string = endpoint.properties.hostName
output customDomainResourceName string = empty(customDomainName) ? '' : customDomain.name
