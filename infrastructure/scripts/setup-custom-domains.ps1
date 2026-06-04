<#
.SYNOPSIS
    Prepares DNS records for custom domains for ChurchTool Billing Tool.

.DESCRIPTION
    This script retrieves the necessary information from Azure resources (Static Web App and Function App)
    and generates the DNS records needed to configure custom domains for both frontend and backend.
    
    It can either:
    1. Output the DNS records for manual configuration in your DNS provider
    2. Automatically create the records in Azure DNS (if using Azure DNS Zone)

.PARAMETER ResourceGroupName
    The name of the Azure resource group containing the resources.

.PARAMETER FrontendResourceName
    The name of the Azure Static Web App (frontend).

.PARAMETER BackendResourceName
    The name of the Azure Function App (backend).

.PARAMETER FrontendDomain
    The custom domain for the frontend (e.g., billing.church-domain.ch).

.PARAMETER BackendDomain
    The custom domain for the backend API (e.g., api-billing.church-domain.ch).

.PARAMETER DnsZoneName
    (Optional) The Azure DNS Zone name if using Azure DNS. If specified, records will be created automatically.

.PARAMETER DnsZoneResourceGroup
    (Optional) The resource group of the Azure DNS Zone (if different from main resource group).

.PARAMETER WhatIf
    Shows what DNS records would be created without actually creating them.

.EXAMPLE
    .\setup-custom-domains.ps1 `
        -ResourceGroupName "rg-ct-billingtool" `
        -FrontendResourceName "swa-ct-billingtool" `
        -BackendResourceName "func-ct-billingtool" `
        -FrontendDomain "billing.feg-effretikon.ch" `
        -BackendDomain "api-billing.feg-effretikon.ch"
    
    Displays the DNS records that need to be configured manually.

.EXAMPLE
    .\setup-custom-domains.ps1 `
        -ResourceGroupName "rg-ct-billingtool" `
        -FrontendResourceName "swa-ct-billingtool" `
        -BackendResourceName "func-ct-billingtool" `
        -FrontendDomain "billing.feg-effretikon.ch" `
        -BackendDomain "api-billing.feg-effretikon.ch" `
        -DnsZoneName "feg-effretikon.ch" `
        -DnsZoneResourceGroup "rg-dns"
    
    Automatically creates DNS records in the specified Azure DNS Zone.

.NOTES
    Prerequisites:
    - Azure CLI must be installed and authenticated (az login)
    - Appropriate permissions to read Azure resources
    - If using Azure DNS: permissions to modify DNS Zone records
    
    Author: ChurchTool Billing Tool Team
    Version: 1.0
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory = $true)]
    [string]$ResourceGroupName,

    [Parameter(Mandatory = $true)]
    [string]$FrontendResourceName,

    [Parameter(Mandatory = $true)]
    [string]$BackendResourceName,

    [Parameter(Mandatory = $true)]
    [string]$FrontendDomain,

    [Parameter(Mandatory = $true)]
    [string]$BackendDomain,

    [Parameter(Mandatory = $false)]
    [string]$DnsZoneName,

    [Parameter(Mandatory = $false)]
    [string]$DnsZoneResourceGroup
)

# Colors for console output
$ColorInfo = "Cyan"
$ColorSuccess = "Green"
$ColorWarning = "Yellow"
$ColorError = "Red"

# Helper function to write colored output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# Check if Azure CLI is installed
function Test-AzureCli {
    try {
        $null = az --version 2>$null
        return $true
    }
    catch {
        Write-ColorOutput "❌ Azure CLI is not installed or not in PATH." $ColorError
        Write-ColorOutput "Please install Azure CLI from: https://aka.ms/InstallAzureCLI" $ColorWarning
        return $false
    }
}

# Check if user is logged in to Azure
function Test-AzureLogin {
    try {
        $account = az account show 2>$null | ConvertFrom-Json
        if ($account) {
            Write-ColorOutput "✅ Logged in as: $($account.user.name)" $ColorSuccess
            Write-ColorOutput "   Subscription: $($account.name)" $ColorInfo
            return $true
        }
    }
    catch {
        Write-ColorOutput "❌ Not logged in to Azure." $ColorError
        Write-ColorOutput "Please run: az login" $ColorWarning
        return $false
    }
    return $false
}

# Get Static Web App default hostname
function Get-StaticWebAppHostname {
    param([string]$ResourceGroup, [string]$Name)
    
    Write-ColorOutput "`n🔍 Retrieving Static Web App information..." $ColorInfo
    
    try {
        $swa = az staticwebapp show `
            --name $Name `
            --resource-group $ResourceGroup `
            --query "{defaultHostname:defaultHostname, id:id}" `
            --output json 2>$null | ConvertFrom-Json
        
        if ($swa -and $swa.defaultHostname) {
            Write-ColorOutput "   Found: $($swa.defaultHostname)" $ColorSuccess
            return $swa.defaultHostname
        }
        else {
            Write-ColorOutput "   ⚠️  Static Web App not found or not yet provisioned." $ColorWarning
            Write-ColorOutput "   Please ensure the Static Web App '$Name' exists in resource group '$ResourceGroup'" $ColorWarning
            return $null
        }
    }
    catch {
        Write-ColorOutput "   ❌ Error retrieving Static Web App: $_" $ColorError
        return $null
    }
}

# Get Function App default hostname
function Get-FunctionAppHostname {
    param([string]$ResourceGroup, [string]$Name)
    
    Write-ColorOutput "`n🔍 Retrieving Function App information..." $ColorInfo
    
    try {
        $funcApp = az functionapp show `
            --name $Name `
            --resource-group $ResourceGroup `
            --query "{defaultHostname:defaultHostName, id:id, verificationId:customDomainVerificationId}" `
            --output json 2>$null | ConvertFrom-Json
        
        if ($funcApp -and $funcApp.defaultHostname) {
            Write-ColorOutput "   Found: $($funcApp.defaultHostname)" $ColorSuccess
            return $funcApp
        }
        else {
            Write-ColorOutput "   ⚠️  Function App not found or not yet provisioned." $ColorWarning
            Write-ColorOutput "   Please ensure the Function App '$Name' exists in resource group '$ResourceGroup'" $ColorWarning
            return $null
        }
    }
    catch {
        Write-ColorOutput "   ❌ Error retrieving Function App: $_" $ColorError
        return $null
    }
}

# Extract subdomain from full domain name
function Get-SubdomainFromDomain {
    param([string]$FullDomain, [string]$ZoneName)
    
    if ($FullDomain.EndsWith(".$ZoneName")) {
        return $FullDomain.Substring(0, $FullDomain.Length - $ZoneName.Length - 1)
    }
    return $FullDomain
}

# Create DNS records in Azure DNS
function Set-AzureDnsRecords {
    param(
        [string]$ZoneName,
        [string]$ZoneResourceGroup,
        [object]$DnsRecords
    )
    
    Write-ColorOutput "`n🌐 Creating DNS records in Azure DNS Zone: $ZoneName" $ColorInfo
    
    $success = $true
    
    foreach ($record in $DnsRecords) {
        $subdomain = Get-SubdomainFromDomain -FullDomain $record.Name -ZoneName $ZoneName
        
        try {
            if ($record.Type -eq "CNAME") {
                Write-ColorOutput "   Creating CNAME record: $subdomain → $($record.Value)" $ColorInfo
                
                if ($PSCmdlet.ShouldProcess("$subdomain.$ZoneName", "Create CNAME record")) {
                    az network dns record-set cname set-record `
                        --resource-group $ZoneResourceGroup `
                        --zone-name $ZoneName `
                        --record-set-name $subdomain `
                        --cname $record.Value `
                        --output none 2>$null
                    
                    Write-ColorOutput "   ✅ CNAME record created successfully" $ColorSuccess
                }
            }
            elseif ($record.Type -eq "TXT") {
                Write-ColorOutput "   Creating TXT record: $subdomain → $($record.Value)" $ColorInfo
                
                if ($PSCmdlet.ShouldProcess("$subdomain.$ZoneName", "Create TXT record")) {
                    az network dns record-set txt add-record `
                        --resource-group $ZoneResourceGroup `
                        --zone-name $ZoneName `
                        --record-set-name $subdomain `
                        --value $record.Value `
                        --output none 2>$null
                    
                    Write-ColorOutput "   ✅ TXT record created successfully" $ColorSuccess
                }
            }
        }
        catch {
            Write-ColorOutput "   ❌ Failed to create record: $_" $ColorError
            $success = $false
        }
    }
    
    return $success
}

# Display DNS records for manual configuration
function Show-DnsRecords {
    param([object[]]$DnsRecords)
    
    Write-ColorOutput "`n" "White"
    Write-ColorOutput "═══════════════════════════════════════════════════════════════════" $ColorInfo
    Write-ColorOutput "  DNS RECORDS TO CONFIGURE" $ColorInfo
    Write-ColorOutput "═══════════════════════════════════════════════════════════════════" $ColorInfo
    Write-ColorOutput "`nPlease add the following records to your DNS provider:`n" $ColorWarning
    
    foreach ($record in $DnsRecords) {
        Write-ColorOutput "─────────────────────────────────────────────────────────────────" "DarkGray"
        Write-ColorOutput "Record Type:  $($record.Type)" $ColorInfo
        Write-ColorOutput "Record Name:  $($record.Name)" "White"
        Write-ColorOutput "Value:        $($record.Value)" "White"
        Write-ColorOutput "TTL:          $($record.TTL) seconds" "Gray"
        
        if ($record.Note) {
            Write-ColorOutput "Note:         $($record.Note)" $ColorWarning
        }
        Write-ColorOutput ""
    }
    
    Write-ColorOutput "═══════════════════════════════════════════════════════════════════" $ColorInfo
}

# Main execution
function Main {
    Write-ColorOutput "`n╔═══════════════════════════════════════════════════════════════════╗" $ColorInfo
    Write-ColorOutput "║  ChurchTool Billing Tool - Custom Domain DNS Setup              ║" $ColorInfo
    Write-ColorOutput "╚═══════════════════════════════════════════════════════════════════╝" $ColorInfo
    
    # Prerequisites check
    if (-not (Test-AzureCli)) { return }
    if (-not (Test-AzureLogin)) { return }
    
    # Retrieve Azure resource information
    $swaHostname = Get-StaticWebAppHostname -ResourceGroup $ResourceGroupName -Name $FrontendResourceName
    $funcApp = Get-FunctionAppHostname -ResourceGroup $ResourceGroupName -Name $BackendResourceName
    
    if (-not $swaHostname -or -not $funcApp) {
        Write-ColorOutput "`n❌ Cannot proceed without valid Azure resource information." $ColorError
        return
    }
    
    # Prepare DNS records
    $dnsRecords = @()
    
    # Frontend (Static Web App) DNS records
    Write-ColorOutput "`n📋 Preparing DNS records for Frontend: $FrontendDomain" $ColorInfo
    
    $dnsRecords += @{
        Type  = "CNAME"
        Name  = $FrontendDomain
        Value = $swaHostname
        TTL   = 3600
        Note  = "Points your custom domain to the Static Web App"
    }
    
    # Backend (Function App) DNS records
    Write-ColorOutput "📋 Preparing DNS records for Backend: $BackendDomain" $ColorInfo
    
    $dnsRecords += @{
        Type  = "CNAME"
        Name  = $BackendDomain
        Value = $funcApp.defaultHostname
        TTL   = 3600
        Note  = "Points your API domain to the Function App"
    }
    
    # Optional: Domain verification TXT record for Function App
    if ($funcApp.verificationId) {
        $dnsRecords += @{
            Type  = "TXT"
            Name  = "asuid.$BackendDomain"
            Value = $funcApp.verificationId
            TTL   = 3600
            Note  = "Domain verification for Function App (required by Azure)"
        }
    }
    
    # Display or create DNS records
    if ($DnsZoneName) {
        $zoneRg = if ($DnsZoneResourceGroup) { $DnsZoneResourceGroup } else { $ResourceGroupName }
        
        Write-ColorOutput "`n🎯 Azure DNS Zone specified: $DnsZoneName" $ColorInfo
        Write-ColorOutput "   Resource Group: $zoneRg" $ColorInfo
        
        if (Set-AzureDnsRecords -ZoneName $DnsZoneName -ZoneResourceGroup $zoneRg -DnsRecords $dnsRecords) {
            Write-ColorOutput "`n✅ DNS records created successfully in Azure DNS!" $ColorSuccess
            Write-ColorOutput "`n⏳ Next steps:" $ColorWarning
            Write-ColorOutput "   1. Wait for DNS propagation (can take up to 48 hours, usually minutes)" $ColorWarning
            Write-ColorOutput "   2. Add custom domains in Azure Portal:" $ColorWarning
            Write-ColorOutput "      - Static Web App → Custom domains → Add" $ColorWarning
            Write-ColorOutput "      - Function App → Custom domains → Add custom domain" $ColorWarning
            Write-ColorOutput "   3. Enable HTTPS/SSL certificates for both domains" $ColorWarning
        }
        else {
            Write-ColorOutput "`n⚠️  Some DNS records failed to create. Please check the output above." $ColorWarning
        }
    }
    else {
        Show-DnsRecords -DnsRecords $dnsRecords
        
        Write-ColorOutput "`n⏳ Next steps:" $ColorWarning
        Write-ColorOutput "   1. Add these DNS records to your DNS provider" $ColorWarning
        Write-ColorOutput "   2. Wait for DNS propagation (can take up to 48 hours)" $ColorWarning
        Write-ColorOutput "   3. Verify DNS propagation: nslookup $FrontendDomain" $ColorWarning
        Write-ColorOutput "   4. Add custom domains in Azure Portal:" $ColorWarning
        Write-ColorOutput "      - Static Web App → Custom domains → Add" $ColorWarning
        Write-ColorOutput "      - Function App → Custom domains → Add custom domain" $ColorWarning
        Write-ColorOutput "   5. Enable HTTPS/SSL certificates for both domains" $ColorWarning
    }
    
    Write-ColorOutput "`n✨ Script completed successfully!`n" $ColorSuccess
}

# Run main function
Main
