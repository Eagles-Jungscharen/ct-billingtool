<#
.SYNOPSIS
    Deploys frontend and/or backend code using infrastructure outputs from a parameter file.

.DESCRIPTION
    Reads infrastructure deployment outputs (default: infrastructure.local at repository root)
    and deploys application code to Azure resources.

    Supported deployments:
    - Frontend: build and upload packages/frontend/dist to storage static website ($web)
    - Backend: build and publish Azure Functions app

    For multi-environment setups (dev/int/prod), pass a different file via -ParameterFile.

.PARAMETER ParameterFile
    Path to the infrastructure output file.
    Default: infrastructure.local (repository root)

.PARAMETER Target
    Which code target to deploy: All, Frontend, Backend.

.PARAMETER SkipBuild
    Skips build commands and deploys existing artifacts.

.PARAMETER FrontendDistPath
    Optional path to frontend dist folder.
    Default: packages/frontend/dist

.PARAMETER BackendPath
    Optional path to backend project folder.
    Default: packages/backend

.EXAMPLE
    ./deploy-code.ps1

.EXAMPLE
    ./deploy-code.ps1 -ParameterFile infrastructure.dev.local -Target Frontend

.EXAMPLE
    ./deploy-code.ps1 -ParameterFile infrastructure.int.local -Target Backend -SkipBuild
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [Alias('InfrastructureFile')]
    [string]$ParameterFile = 'infrastructure.local',

    [Parameter(Mandatory = $false)]
    [ValidateSet('All', 'Frontend', 'Backend')]
    [string]$Target = 'All',

    [Parameter(Mandatory = $false)]
    [switch]$SkipBuild,

    [Parameter(Mandatory = $false)]
    [string]$FrontendDistPath = 'packages/frontend/dist',

    [Parameter(Mandatory = $false)]
    [string]$BackendPath = 'packages/backend'
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

function Invoke-Tool {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Tool,

        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,

        [Parameter(Mandatory = $true)]
        [string]$WorkingDirectory
    )

    Push-Location $WorkingDirectory
    try {
        & $Tool @Arguments
        $exitCode = $LASTEXITCODE
    }
    finally {
        Pop-Location
    }

    if ($exitCode -ne 0) {
        $joinedArgs = $Arguments -join ' '
        throw "Command failed (exit code $exitCode): $Tool $joinedArgs"
    }
}

function Resolve-PathFromRepoRoot {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot,

        [Parameter(Mandatory = $true)]
        [string]$PathValue
    )

    if ([System.IO.Path]::IsPathRooted($PathValue)) {
        return $PathValue
    }

    return (Join-Path -Path $RepoRoot -ChildPath $PathValue)
}

$repoRoot = Split-Path -Path (Split-Path -Path $PSScriptRoot -Parent) -Parent

Write-Info 'Validating required tools...'
if (-not (Get-Command -Name az -ErrorAction SilentlyContinue)) {
    throw 'Azure CLI (az) is not installed or not available in PATH.'
}
if (-not (Get-Command -Name npm -ErrorAction SilentlyContinue)) {
    throw 'npm is not installed or not available in PATH.'
}

$parameterFilePath = Resolve-PathFromRepoRoot -RepoRoot $repoRoot -PathValue $ParameterFile
$frontendDistFullPath = Resolve-PathFromRepoRoot -RepoRoot $repoRoot -PathValue $FrontendDistPath
$backendFullPath = Resolve-PathFromRepoRoot -RepoRoot $repoRoot -PathValue $BackendPath

if (-not (Test-Path -Path $parameterFilePath)) {
    throw "Parameter file not found: $parameterFilePath"
}

Write-Info "Reading infrastructure values from: $parameterFilePath"
$infra = Get-Content -Path $parameterFilePath -Raw | ConvertFrom-Json

if (-not $infra.outputs) {
    throw "Parameter file '$parameterFilePath' does not contain an 'outputs' object."
}

$frontendStorageAccountName = $infra.outputs.frontendStorageAccountName
$functionAppName = $infra.outputs.functionAppName

if (($Target -eq 'All' -or $Target -eq 'Frontend') -and [string]::IsNullOrWhiteSpace($frontendStorageAccountName)) {
    throw "The parameter file '$parameterFilePath' does not contain outputs.frontendStorageAccountName."
}

if (($Target -eq 'All' -or $Target -eq 'Backend') -and [string]::IsNullOrWhiteSpace($functionAppName)) {
    throw "The parameter file '$parameterFilePath' does not contain outputs.functionAppName."
}

Write-Info 'Validating Azure login context...'
Invoke-AzCli -Arguments @('account', 'show', '--output', 'none', '--only-show-errors') | Out-Null

if ($Target -eq 'All' -or $Target -eq 'Frontend') {
    Write-Info 'Starting frontend deployment...'

    if (-not $SkipBuild) {
        Write-Info 'Building frontend...'
        Invoke-Tool -Tool 'npm' -Arguments @('run', 'build:frontend') -WorkingDirectory $repoRoot
    }

    if (-not (Test-Path -Path $frontendDistFullPath)) {
        throw "Frontend dist path does not exist: $frontendDistFullPath"
    }

    Write-Info "Uploading frontend artifacts to storage account: $frontendStorageAccountName"
    Invoke-AzCli -Arguments @(
        'storage',
        'blob',
        'upload-batch',
        '--account-name',
        $frontendStorageAccountName,
        '--source',
        $frontendDistFullPath,
        '--destination',
        '$web',
        '--overwrite',
        '--only-show-errors'
    ) | Out-Null

    Write-Success 'Frontend deployment completed.'
}

if ($Target -eq 'All' -or $Target -eq 'Backend') {
    Write-Info 'Starting backend deployment...'

    if (-not (Get-Command -Name func -ErrorAction SilentlyContinue)) {
        throw 'Azure Functions Core Tools (func) is not installed or not available in PATH.'
    }

    if (-not $SkipBuild) {
        Write-Info 'Building backend...'
        Invoke-Tool -Tool 'npm' -Arguments @('run', 'build:backend') -WorkingDirectory $repoRoot
    }

    if (-not (Test-Path -Path $backendFullPath)) {
        throw "Backend path does not exist: $backendFullPath"
    }

    Write-Info "Publishing function app: $functionAppName"
    Invoke-Tool -Tool 'func' -Arguments @('azure', 'functionapp', 'publish', $functionAppName, '--dotnet-isolated') -WorkingDirectory $backendFullPath

    Write-Success 'Backend deployment completed.'
}

Write-Success 'Code deployment finished successfully.'