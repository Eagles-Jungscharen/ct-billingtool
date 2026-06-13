<#
.SYNOPSIS
    Deploys Azure infrastructure defined in infrastructure/azure and writes deployment outputs to a local infrastructure file.

.DESCRIPTION
    This script deploys the Bicep template at infrastructure/azure/main.bicep to a given resource group.
    After a successful deployment, it writes a machine-readable output file at repository root.

    The file is intended to be consumed by later code deployment steps (frontend/backend).

    Default output file:
    - infrastructure.local

    Optional environment-based naming:
    - infrastructure.<environment>.local (for example: infrastructure.dev.local)

.PARAMETER ResourceGroupName
    Name of the target Azure resource group.

.PARAMETER EnvironmentName
    Environment name passed to Bicep (for example: dev, staging, prod).

.PARAMETER Location
    Azure location passed to Bicep (for example: westeurope).

.PARAMETER Prefix
    Project prefix passed to Bicep for generated names.

.PARAMETER SubscriptionId
    Optional Azure subscription id. If set, the script switches context before deployment.

.PARAMETER EnableCdn
    Enables or disables CDN module deployment.

.PARAMETER FrontendCustomDomain
    Optional frontend custom domain for CDN (for example: billing.example.org).

.PARAMETER DeploymentName
    Optional deployment name. If omitted, a timestamp-based name is generated.

.PARAMETER OutputFile
    Optional output file path for deployment outputs.
    If this parameter is set, it takes precedence over UseEnvironmentOutputFile.

.PARAMETER UseEnvironmentOutputFile
    If set, output is written to infrastructure.<EnvironmentName>.local in repository root.

.PARAMETER ChurchToolUrl
    ChurchTools base URL used by the backend (for example: https://your-church.church.tools).

.PARAMETER OidcAuthorityUrl
    OIDC authority URL for JWT validation in backend.

.PARAMETER ChurchToolIdpStorageConnectionString
    Storage connection string used by ChurchTool IDP integration.

.PARAMETER ChurchToolIdpBaseUrl
    Base URL of the ChurchTool IDP Functions endpoint.

.PARAMETER ChurchToolIdpFunctionKey
    Function key for ChurchTool IDP Functions endpoint.

.PARAMETER ChurchToolAdminGroupId
    ChurchTool group id that grants admin access.

.PARAMETER QrBillFunctionBaseUrl
    Optional QR bill function base URL. Leave empty to disable QR bill generation calls.

.PARAMETER QrBillFunctionKey
    Optional QR bill function key.

.PARAMETER QrBillContainerName
    Blob container name for QR bill files. Defaults to 'invoice-qrbills'.

.PARAMETER QrBillStorageConnectionString
    Optional storage connection string for QR bill blobs. Uses runtime storage when omitted.

.EXAMPLE
    ./deploy.ps1 -ResourceGroupName rg-ct-billingtool -EnvironmentName prod -Location westeurope -Prefix ctbilling

.EXAMPLE
    ./deploy.ps1 -ResourceGroupName rg-ct-billingtool -EnvironmentName prod -Location westeurope -Prefix ctbilling -SubscriptionId 00000000-0000-0000-0000-000000000000 -EnableCdn $true

.EXAMPLE
    ./deploy.ps1 -ResourceGroupName rg-ct-billingtool -EnvironmentName dev -Location westeurope -Prefix ctbilling -UseEnvironmentOutputFile

.EXAMPLE
    ./deploy.ps1 -ResourceGroupName rg-ct-billingtool -EnvironmentName int -Location westeurope -Prefix ctbilling -OutputFile infrastructure.int.local
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$ResourceGroupName,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$EnvironmentName,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$Location,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$Prefix,

    [Parameter(Mandatory = $false)]
    [string]$SubscriptionId,

    [Parameter(Mandatory = $true)]
    [bool]$EnableCdn = $true,

    [Parameter(Mandatory = $false)]
    [string]$FrontendCustomDomain,

    [Parameter(Mandatory = $false)]
    [string]$DeploymentName,

    [Parameter(Mandatory = $false)]
    [string]$OutputFile,

    [Parameter(Mandatory = $false)]
    [switch]$UseEnvironmentOutputFile,

    # ChurchTool / OIDC Pflichtparameter
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$ChurchToolUrl,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$OidcAuthorityUrl,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$ChurchToolIdpStorageConnectionString,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$ChurchToolIdpBaseUrl,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$ChurchToolIdpFunctionKey,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$ChurchToolAdminGroupId,

    # QR-Bill Parameter
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$QrBillFunctionBaseUrl,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$QrBillFunctionKey

)

Set-StrictMode -Version 3.0
$ErrorActionPreference = 'Stop'

function Write-Info {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Green
}

function Write-WarningText {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Yellow
}

function Invoke-AzCli {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    $result = & az @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        $joinedArgs = $Arguments -join ' '
        throw "Azure CLI command failed (exit code $exitCode): az $joinedArgs`n$result"
    }

    return $result
}

# Ermittelt den Repository-Root relativ zum Skriptpfad.
$repoRoot = Split-Path -Path (Split-Path -Path $PSScriptRoot -Parent) -Parent
$templatePath = Join-Path -Path $repoRoot -ChildPath 'infrastructure/azure/main.bicep'

# Ermittelt die Zieldatei fuer Deployment-Outputs mit klarer Prioritaet.
if (-not [string]::IsNullOrWhiteSpace($OutputFile)) {
    if ([System.IO.Path]::IsPathRooted($OutputFile)) {
        $outputPath = $OutputFile
    }
    else {
        $outputPath = Join-Path -Path $repoRoot -ChildPath $OutputFile
    }
}
elseif ($UseEnvironmentOutputFile.IsPresent) {
    $outputPath = Join-Path -Path $repoRoot -ChildPath "infrastructure.$EnvironmentName.local"
}
else {
    $outputPath = Join-Path -Path $repoRoot -ChildPath 'infrastructure.local'
}

if (-not (Test-Path -Path $templatePath)) {
    throw "Bicep template was not found: $templatePath"
}

Write-Info 'Validating Azure CLI availability...'
if (-not (Get-Command -Name az -ErrorAction SilentlyContinue)) {
    throw 'Azure CLI (az) is not installed or not available in PATH.'
}

Write-Info 'Validating Azure login context...'
$accountRaw = Invoke-AzCli -Arguments @('account', 'show', '--output', 'json', '--only-show-errors')
$account = $accountRaw | ConvertFrom-Json

if (-not [string]::IsNullOrWhiteSpace($SubscriptionId)) {
    Write-Info "Switching Azure subscription context to: $SubscriptionId"
    Invoke-AzCli -Arguments @('account', 'set', '--subscription', $SubscriptionId, '--only-show-errors') | Out-Null
    $accountRaw = Invoke-AzCli -Arguments @('account', 'show', '--output', 'json', '--only-show-errors')
    $account = $accountRaw | ConvertFrom-Json
}

Write-Info "Using Azure subscription: $($account.name) ($($account.id))"

Write-Info "Validating resource group: $ResourceGroupName"
$resourceGroupExistsRaw = Invoke-AzCli -Arguments @('group', 'exists', '--name', $ResourceGroupName, '--output', 'tsv', '--only-show-errors')
$resourceGroupExists = "$resourceGroupExistsRaw".Trim().ToLowerInvariant()
if ($resourceGroupExists -ne 'true') {
    throw "Resource group '$ResourceGroupName' does not exist. Create it first or use another name."
}

if ([string]::IsNullOrWhiteSpace($DeploymentName)) {
    $DeploymentName = "ct-billingtool-$EnvironmentName-$(Get-Date -Format 'yyyyMMddHHmmss')"
}

$enableCdnValue = $EnableCdn.ToString().ToLowerInvariant()

$deploymentParameters = @(
    "environmentName=$EnvironmentName"
    "location=$Location"
    "prefix=$Prefix"
    "enableCdn=$enableCdnValue"
    "churchToolUrl=$ChurchToolUrl"
    "oidcAuthorityUrl=$OidcAuthorityUrl"
    "churchToolIdpStorageConnectionString=$ChurchToolIdpStorageConnectionString"
    "churchToolIdpBaseUrl=$ChurchToolIdpBaseUrl"
    "churchToolIdpFunctionKey=$ChurchToolIdpFunctionKey"
    "churchToolAdminGroupId=$ChurchToolAdminGroupId"
    "qrBillFunctionBaseUrl=$QrBillFunctionBaseUrl"
    "qrBillFunctionKey=$QrBillFunctionKey"
)

if (-not [string]::IsNullOrWhiteSpace($FrontendCustomDomain)) {
    $deploymentParameters += "frontendCustomDomain=$FrontendCustomDomain"
}

Write-Info 'Starting infrastructure deployment via Bicep...'
$deploymentArgs = @(
    'deployment',
    'group',
    'create',
    '--name',
    $DeploymentName,
    '--resource-group',
    $ResourceGroupName,
    '--template-file',
    $templatePath,
    '--parameters'
)
$deploymentArgs += $deploymentParameters
$deploymentArgs += @('--output', 'json', '--only-show-errors')

$deploymentRaw = Invoke-AzCli -Arguments $deploymentArgs
$deployment = $deploymentRaw | ConvertFrom-Json -Depth 30

if (-not $deployment.properties -or -not $deployment.properties.outputs) {
    throw 'Deployment did not return outputs. Output file cannot be generated.'
}

$outputs = $deployment.properties.outputs

# Schreibt nur die benötigten Informationen für nachgelagerte Code-Deployments.
$resultObject = [ordered]@{
    deployment = [ordered]@{
        name = $DeploymentName
        resourceGroupName = $ResourceGroupName
        subscriptionId = $account.id
        environmentName = $EnvironmentName
        location = $Location
        prefix = $Prefix
        enableCdn = $EnableCdn
        frontendCustomDomain = $FrontendCustomDomain
        timestampUtc = (Get-Date).ToUniversalTime().ToString('o')
    }
    outputs = [ordered]@{
        frontendStorageAccountName = $outputs.frontendStorageAccountName.value
        frontendWebsiteUrl = $outputs.frontendWebsiteUrl.value
        dataStorageAccountName = $outputs.dataStorageAccountName.value
        functionAppName = $outputs.functionAppName.value
        functionAppUrl = $outputs.functionAppUrl.value
        applicationInsightsName = $outputs.applicationInsightsName.value
        cdnEndpointHostName = $outputs.cdnEndpointHostName.value
    }
    codeDeployment = [ordered]@{
        frontend = [ordered]@{
            storageAccountName = $outputs.frontendStorageAccountName.value
            websiteUrl = $outputs.frontendWebsiteUrl.value
        }
        backend = [ordered]@{
            functionAppName = $outputs.functionAppName.value
            functionAppUrl = $outputs.functionAppUrl.value
        }
    }
}

$json = $resultObject | ConvertTo-Json -Depth 20

$outputDirectory = Split-Path -Path $outputPath -Parent
if (-not [string]::IsNullOrWhiteSpace($outputDirectory) -and -not (Test-Path -Path $outputDirectory)) {
    New-Item -Path $outputDirectory -ItemType Directory -Force | Out-Null
}

Set-Content -Path $outputPath -Value $json -Encoding utf8

Write-Success 'Infrastructure deployment completed successfully.'
Write-Success "Deployment name: $DeploymentName"
Write-Success "Output file written: $outputPath"
Write-WarningText "Use '$outputPath' as the source for later code deployment steps."