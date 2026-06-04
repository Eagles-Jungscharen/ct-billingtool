using EaglesJungscharen.Azure.BillingTool.Models;
using EaglesJungscharen.Azure.BillingTool.Models.Entities;
using EaglesJungscharen.Azure.BillingTool.Services;
using EaglesJungscharen.Azure.ChurchToolIDPServices.Extensions;
using EaglesJungscharen.Azure.ChurchToolIDPServices.Middleware;
using GuedesPlace.AzureTools.Configuration.Extensions;
using GuedesPlace.AzureTools.Tables;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = FunctionsApplication.CreateBuilder(args);

builder.ConfigureFunctionsWebApplication();

builder.Configuration.CheckConfigurationValuesAvailable(new[]
{
    "CHURCHTOOL_IDP_BASE_URL",
    "CHURCHTOOL_IDP_FUNCTION_KEY",
    "CHURCHTOOL_URL",
    "OIDC_AUTHORITY_URL",
    "CHURCHTOOL_IDP_STORAGE_CONNECTION_STRING",
    "CHURCHTOOL_ADMIN_GROUP_ID",
    "AzureWebJobsStorage",
});

// BillingTool-Konfiguration (stark typisiert)
builder.Services.Configure<BillingToolConfiguration>(config =>
{
    config.ChurchToolAdminGroupId = builder.Configuration["CHURCHTOOL_ADMIN_GROUP_ID"]!;
});

builder.Services
    .AddApplicationInsightsTelemetryWorkerService()
    .ConfigureFunctionsApplicationInsights();

// In-Memory-Cache für MeDto und andere kurzlebige Daten
builder.Services.AddMemoryCache();

// IHttpClientFactory
builder.Services.AddHttpClient();

// HTTP-Client für das Churchtool IDP Backend
var idpBaseUrl = builder.Configuration["CHURCHTOOL_IDP_BASE_URL"];
var idpFunctionKey = builder.Configuration["CHURCHTOOL_IDP_FUNCTION_KEY"];
if (!string.IsNullOrWhiteSpace(idpBaseUrl))
{
    builder.Services.AddHttpClient("ChurchtoolIdp", client =>
    {
        client.BaseAddress = new Uri(idpBaseUrl);
        if (!string.IsNullOrWhiteSpace(idpFunctionKey))
            client.DefaultRequestHeaders.Add("x-functions-key", idpFunctionKey);
    });
}

// JWT-Validierungs-Middleware via ChurchTool IDP
builder.Services.AddChurchToolIDPServices(
    churchToolUrl: builder.Configuration["CHURCHTOOL_URL"]
        ?? throw new InvalidOperationException("CHURCHTOOL_URL is not configured."),
    oidcAuthorityUrl: builder.Configuration["OIDC_AUTHORITY_URL"]
        ?? throw new InvalidOperationException("OIDC_AUTHORITY_URL is not configured."),
    churchToolIDPStorageConnectionString: builder.Configuration["CHURCHTOOL_IDP_STORAGE_CONNECTION_STRING"]
        ?? throw new InvalidOperationException("CHURCHTOOL_IDP_STORAGE_CONNECTION_STRING is not configured."));

// Service-Registrierungen
builder.Services.AddScoped<IMeService, MeService>();

// Table Storage für Billing-Daten (Rechnungsprofile, Rechnungen, Positionen)
var billingTableService = new ExtendedAzureTableClientService(
    builder.Configuration["AzureWebJobsStorage"]
        ?? throw new InvalidOperationException("AzureWebJobsStorage ist nicht konfiguriert."));

billingTableService.CreateAndRegisterTableClient<RechnungsprofilEntity>("BillingProfiles");
billingTableService.CreateAndRegisterTableClient<RechnungEntity>("Invoices");
billingTableService.CreateAndRegisterTableClient<RechnungspositionEntity>("InvoicePositions");

builder.Services.AddKeyedSingleton<ExtendedAzureTableClientService>("BillingStorage", billingTableService);

builder.Services.AddScoped<IInvoiceProfileService, InvoiceProfileService>();
builder.Services.AddScoped<IInvoiceService, InvoiceService>();

builder.UseMiddleware<JwtValidationMiddleware>();
builder.UseMiddleware<ChurchToolReferenceMiddleware>();

builder.Build().Run();
