using System.Net.Http.Json;
using Azure;
using Azure.Storage.Blobs;
using EaglesJungscharen.Azure.BillingTool.Models;
using EaglesJungscharen.Azure.BillingTool.Models.Entities;
using GuedesPlace.AzureTools.Tables;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace EaglesJungscharen.Azure.BillingTool.Services;

public class InvoiceQrBillService(
    [FromKeyedServices("BillingStorage")] ExtendedAzureTableClientService tableService,
    BlobContainerClient blobContainerClient,
    IHttpClientFactory httpClientFactory,
    ILogger<InvoiceQrBillService> logger) : IInvoiceQrBillService
{
    private const string InvoiceProfilePartitionKey = "RechnungsProfil";
    private readonly TypedAzureTableClient<RechnungsprofilEntity> _profileTable =
        tableService.GetTypedTableClient<RechnungsprofilEntity>();

    private readonly BlobContainerClient _blobContainerClient = blobContainerClient;
    private readonly IHttpClientFactory _httpClientFactory = httpClientFactory;
    private readonly ILogger<InvoiceQrBillService> _logger = logger;

    public async Task TryGenerateAndStoreAsync(
        RechnungEntity invoice,
        List<RechnungspositionEntity> positions,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(invoice.RechnungsprofilId))
        {
            _logger.LogInformation("QR-Bill übersprungen für Rechnung {InvoiceId}: Kein Rechnungsprofil gesetzt.", invoice.Id);
            return;
        }

        if (!HasRequiredDebitorData(invoice))
        {
            _logger.LogInformation("QR-Bill übersprungen für Rechnung {InvoiceId}: Empfängerdaten unvollständig.", invoice.Id);
            return;
        }

        var profileResult = await _profileTable.GetByIdAsync(invoice.RechnungsprofilId, InvoiceProfilePartitionKey);
        if (profileResult is null)
        {
            _logger.LogWarning("QR-Bill übersprungen für Rechnung {InvoiceId}: Profil {ProfileId} nicht gefunden.",
                invoice.Id, invoice.RechnungsprofilId);
            return;
        }

        var profile = profileResult.Entity;
        if (!HasRequiredCreditorData(profile))
        {
            _logger.LogWarning("QR-Bill übersprungen für Rechnung {InvoiceId}: Absenderdaten im Profil {ProfileId} unvollständig.",
                invoice.Id, invoice.RechnungsprofilId);
            return;
        }

        var amount = Math.Round((decimal)positions.Sum(p => p.Anzahl * p.PreisProEinheit), 2);

        var payload = new QrBillRequest
        {
            Account = profile.Iban,
            Creditor = new QrBillAddress
            {
                Name = profile.AbsenderName,
                Street = profile.Strasse,
                HouseNumber = profile.Hausnummer,
                PostalCode = profile.Plz,
                Town = profile.Ort,
                CountryCode = "CH",
            },
            Debitor = new QrBillAddress
            {
                Name = invoice.EmpfaengerName,
                Street = invoice.EmpfaengerStrasse,
                HouseNumber = invoice.EmpfaengerHausnummer,
                PostalCode = invoice.EmpfaengerPlz,
                Town = invoice.EmpfaengerOrt,
                CountryCode = "CH",
            },
            Currency = "CHF",
            Amount = amount,
            ReferenceNumber = null,
            InfoText = invoice.Rechnungsnummer,
        };

        try
        {
            var client = _httpClientFactory.CreateClient("QrBillFunction");
            using var response = await client.PostAsJsonAsync("/api/GenerateQRBill?png=1", payload, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("QR-Bill Generierung fehlgeschlagen für Rechnung {InvoiceId}. Status={StatusCode}",
                    invoice.Id, (int)response.StatusCode);
                return;
            }

            var bytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
            if (bytes.Length == 0)
            {
                _logger.LogWarning("QR-Bill Generierung lieferte leeren Inhalt für Rechnung {InvoiceId}.", invoice.Id);
                return;
            }

            await _blobContainerClient.CreateIfNotExistsAsync(cancellationToken: cancellationToken);
            var blobClient = _blobContainerClient.GetBlobClient(GetBlobPath(invoice.Id));
            await blobClient.UploadAsync(BinaryData.FromBytes(bytes), overwrite: true, cancellationToken);

            _logger.LogInformation("QR-Bill erfolgreich gespeichert für Rechnung {InvoiceId} im Blob {BlobName}.",
                invoice.Id, blobClient.Name);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "QR-Bill Verarbeitung fehlgeschlagen für Rechnung {InvoiceId}.", invoice.Id);
        }
    }

    public async Task<QrBillFileResult?> TryGetStoredAsync(string invoiceId, CancellationToken cancellationToken = default)
    {
        var blobClient = _blobContainerClient.GetBlobClient(GetBlobPath(invoiceId));

        try
        {
            if (!await blobClient.ExistsAsync(cancellationToken))
                return null;

            var downloadResult = await blobClient.DownloadContentAsync(cancellationToken);
            return new QrBillFileResult(
                downloadResult.Value.Content.ToArray(),
                "image/png",
                $"qrbill-{invoiceId}.png");
        }
        catch (RequestFailedException ex)
        {
            _logger.LogError(ex, "QR-Bill Blob konnte für Rechnung {InvoiceId} nicht gelesen werden.", invoiceId);
            return null;
        }
    }

    private static string GetBlobPath(string invoiceId) => $"invoices/{invoiceId}/qrbill.png";

    private static bool HasRequiredDebitorData(RechnungEntity invoice) =>
        !string.IsNullOrWhiteSpace(invoice.EmpfaengerName)
        && !string.IsNullOrWhiteSpace(invoice.EmpfaengerStrasse)
        && !string.IsNullOrWhiteSpace(invoice.EmpfaengerHausnummer)
        && !string.IsNullOrWhiteSpace(invoice.EmpfaengerPlz)
        && !string.IsNullOrWhiteSpace(invoice.EmpfaengerOrt);

    private static bool HasRequiredCreditorData(RechnungsprofilEntity profile) =>
        !string.IsNullOrWhiteSpace(profile.Iban)
        && !string.IsNullOrWhiteSpace(profile.AbsenderName)
        && !string.IsNullOrWhiteSpace(profile.Strasse)
        && !string.IsNullOrWhiteSpace(profile.Hausnummer)
        && !string.IsNullOrWhiteSpace(profile.Plz)
        && !string.IsNullOrWhiteSpace(profile.Ort);

    private class QrBillRequest
    {
        public required string Account { get; init; }
        public required QrBillAddress Creditor { get; init; }
        public required QrBillAddress Debitor { get; init; }
        public required string Currency { get; init; }
        public decimal Amount { get; init; }
        public string? ReferenceNumber { get; init; }
        public string? InfoText { get; init; }
    }

    private class QrBillAddress
    {
        public required string Name { get; init; }
        public required string Street { get; init; }
        public required string HouseNumber { get; init; }
        public required string PostalCode { get; init; }
        public required string Town { get; init; }
        public required string CountryCode { get; init; }
    }
}
