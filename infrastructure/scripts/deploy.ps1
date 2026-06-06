<#
.SYNOPSIS
    Deploys Azure infrastructure defined in infrastructure/azure and writes deployment outputs to infrastructure.local.

.DESCRIPTION
    This script deploys the Bicep template at infrastructure/azure/main.bicep to a given resource group.
    After a successful deployment, it writes a machine-readable output file at repository root:
    infrastructure.local

    The file is intended to be consumed by later code deployment steps (frontend/backend).

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

.EXAMPLE
    ./deploy.ps1 -ResourceGroupName rg-ct-billingtool -EnvironmentName prod -Location westeurope -Prefix ctbilling

.EXAMPLE
    ./deploy.ps1 -ResourceGroupName rg-ct-billingtool -EnvironmentName prod -Location westeurope -Prefix ctbilling -SubscriptionId 00000000-0000-0000-0000-000000000000 -EnableCdn $true
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

    [Parameter(Mandatory = $false)]
    [bool]$EnableCdn = $true,

    [Parameter(Mandatory = $false)]
    [string]$FrontendCustomDomain,

    [Parameter(Mandatory = $false)]
    [string]$DeploymentName
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
$outputPath = Join-Path -Path $repoRoot -ChildPath 'infrastructure.local'

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
    throw 'Deployment did not return outputs. infrastructure.local cannot be generated.'
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
Set-Content -Path $outputPath -Value $json -Encoding utf8

Write-Success 'Infrastructure deployment completed successfully.'
Write-Success "Deployment name: $DeploymentName"
Write-Success "Output file written: $outputPath"
Write-WarningText 'Use infrastructure.local as the source for later code deployment steps.'