using EaglesJungscharen.Azure.BillingTool.Models.Dtos;
using EaglesJungscharen.Azure.BillingTool.Models;
using EaglesJungscharen.Azure.BillingTool.Models.Entities;
using EaglesJungscharen.Azure.BillingTool.Models.Requests;
using GuedesPlace.AzureTools.Tables;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace EaglesJungscharen.Azure.BillingTool.Services;

public class InvoiceService(
    [FromKeyedServices("BillingStorage")] ExtendedAzureTableClientService tableService,
    IInvoiceQrBillService invoiceQrBillService,
    ILogger<InvoiceService> logger) : IInvoiceService
{
    private const string InvoicePartitionKey = "Invoice";

    private readonly TypedAzureTableClient<RechnungEntity> _invoiceTable =
        tableService.GetTypedTableClient<RechnungEntity>();

    private readonly TypedAzureTableClient<RechnungspositionEntity> _positionsTable =
        tableService.GetTypedTableClient<RechnungspositionEntity>();

    private readonly IInvoiceQrBillService _invoiceQrBillService = invoiceQrBillService;
    private readonly ILogger<InvoiceService> _logger = logger;

    public async Task<List<RechnungDto>> GetAllAsync(string userId, bool isAdmin)
    {
        var invoices = (await _invoiceTable.GetAllAsync(InvoicePartitionKey))
            .Select(r => r.Entity)
            .Where(e => isAdmin || e.UserId == userId)
            .ToList();

        var dtos = new List<RechnungDto>(invoices.Count);
        foreach (var invoice in invoices)
        {
            var positions = await LoadPositionsAsync(invoice.Id);
            dtos.Add(ToDto(invoice, positions));
        }
        return dtos;
    }

    public async Task<RechnungDto?> GetByIdAsync(string id, string userId, bool isAdmin)
    {
        var result = await _invoiceTable.GetByIdAsync(id, InvoicePartitionKey);
        if (result is null)
            return null;

        var entity = result.Entity;
        if (!isAdmin && entity.UserId != userId)
            return null;

        var positions = await LoadPositionsAsync(entity.Id);
        return ToDto(entity, positions);
    }

    public async Task<RechnungDto> CreateAsync(string userId, CreateUpdateRechnungRequest request)
    {
        var now = DateTime.UtcNow.ToString("o");
        var entity = new RechnungEntity
        {
            Id = Guid.NewGuid().ToString(),
            UserId = userId,
            RechnungsprofilId = request.RechnungsprofilId,
            Rechnungsnummer = request.Rechnungsnummer,
            Titel = request.Titel,
            Beschreibung = request.Beschreibung,
            Status = request.Status,
            RechnungsDatum = request.RechnungsDatum,
            EmpfaengerName = request.EmpfaengerName,
            EmpfaengerStrasse = request.EmpfaengerStrasse,
            EmpfaengerHausnummer = request.EmpfaengerHausnummer,
            EmpfaengerPlz = request.EmpfaengerPlz,
            EmpfaengerOrt = request.EmpfaengerOrt,
            CreatedAt = now,
            UpdatedAt = now,
        };
        await _invoiceTable.InsertOrReplaceAsync(rowKey: entity.Id, partitionKey: InvoicePartitionKey, entity);

        var positions = await SavePositionsAsync(entity.Id, request.Positionen);

        await _invoiceQrBillService.TryGenerateAndStoreAsync(entity, positions);

        return ToDto(entity, positions);
    }

    public async Task<RechnungDto?> UpdateAsync(string id, string userId, bool isAdmin, CreateUpdateRechnungRequest request)
    {
        var existing = await _invoiceTable.GetByIdAsync(id, InvoicePartitionKey);
        if (existing is null)
            return null;

        var entity = existing.Entity;
        if (!isAdmin && entity.UserId != userId)
            return null;

        var existingPositions = await LoadPositionsAsync(entity.Id);
        var shouldRegenerateQrBill = HaveQrRelevantFieldsChanged(entity, request, existingPositions);

        entity.RechnungsprofilId = request.RechnungsprofilId;
        entity.Rechnungsnummer = request.Rechnungsnummer;
        entity.Titel = request.Titel;
        entity.Beschreibung = request.Beschreibung;
        entity.Status = request.Status;
        entity.RechnungsDatum = request.RechnungsDatum;
        entity.EmpfaengerName = request.EmpfaengerName;
        entity.EmpfaengerStrasse = request.EmpfaengerStrasse;
        entity.EmpfaengerHausnummer = request.EmpfaengerHausnummer;
        entity.EmpfaengerPlz = request.EmpfaengerPlz;
        entity.EmpfaengerOrt = request.EmpfaengerOrt;
        entity.UpdatedAt = DateTime.UtcNow.ToString("o");

        await _invoiceTable.InsertOrReplaceAsync(rowKey: entity.Id, partitionKey: InvoicePartitionKey, entity);

        await DeletePositionsAsync(entity.Id);
        var positions = await SavePositionsAsync(entity.Id, request.Positionen);

        if (shouldRegenerateQrBill)
        {
            await _invoiceQrBillService.TryGenerateAndStoreAsync(entity, positions);
        }
        else
        {
            _logger.LogInformation("QR-Bill Neugenerierung übersprungen für Rechnung {InvoiceId}: Keine relevanten Änderungen.", entity.Id);
        }

        return ToDto(entity, positions);
    }

    public async Task<QrBillFileResult?> GetQrBillAsync(string id, string userId, bool isAdmin)
    {
        var existing = await _invoiceTable.GetByIdAsync(id, InvoicePartitionKey);
        if (existing is null)
            return null;

        var entity = existing.Entity;
        if (!isAdmin && entity.UserId != userId)
            return null;

        return await _invoiceQrBillService.TryGetStoredAsync(id);
    }

    public async Task<bool> DeleteAsync(string id, string userId, bool isAdmin)
    {
        var existing = await _invoiceTable.GetByIdAsync(id, InvoicePartitionKey);
        if (existing is null)
            return false;

        var entity = existing.Entity;
        if (!isAdmin && entity.UserId != userId)
            return false;

        await _invoiceTable.DeleteEntityAsync(rowKey: id, partitionKey: InvoicePartitionKey);
        await DeletePositionsAsync(id);
        return true;
    }

    private async Task<List<RechnungspositionEntity>> LoadPositionsAsync(string invoiceId)
    {
        var results = await _positionsTable.GetAllAsync(invoiceId);
        return results.Select(r => r.Entity).OrderBy(p => p.Nummer).ToList();
    }

    private async Task<List<RechnungspositionEntity>> SavePositionsAsync(
        string invoiceId, List<CreateUpdateRechnungspositionRequest> positions)
    {
        var entities = new List<RechnungspositionEntity>(positions.Count);
        foreach (var pos in positions)
        {
            var entity = new RechnungspositionEntity
            {
                Id = Guid.NewGuid().ToString(),
                Nummer = pos.Nummer,
                Titel = pos.Titel,
                Beschreibung = pos.Beschreibung,
                Einheit = pos.Einheit,
                Anzahl = pos.Anzahl,
                PreisProEinheit = pos.PreisProEinheit,
            };
            await _positionsTable.InsertOrReplaceAsync(rowKey: entity.Id, partitionKey: invoiceId, entity);
            entities.Add(entity);
        }
        return entities;
    }

    private async Task DeletePositionsAsync(string invoiceId)
    {
        var existing = await _positionsTable.GetAllAsync(invoiceId);
        foreach (var result in existing)
            await _positionsTable.DeleteEntityAsync(rowKey: result.Entity.Id, partitionKey: invoiceId);
    }

    private static bool HaveQrRelevantFieldsChanged(
        RechnungEntity current,
        CreateUpdateRechnungRequest request,
        List<RechnungspositionEntity> existingPositions)
    {
        if (!string.Equals(current.RechnungsprofilId, request.RechnungsprofilId, StringComparison.Ordinal))
            return true;

        if (!string.Equals(current.Rechnungsnummer, request.Rechnungsnummer, StringComparison.Ordinal))
            return true;

        if (!string.Equals(current.RechnungsDatum, request.RechnungsDatum, StringComparison.Ordinal))
            return true;

        if (!string.Equals(current.EmpfaengerName, request.EmpfaengerName, StringComparison.Ordinal))
            return true;

        if (!string.Equals(current.EmpfaengerStrasse, request.EmpfaengerStrasse, StringComparison.Ordinal))
            return true;

        if (!string.Equals(current.EmpfaengerHausnummer, request.EmpfaengerHausnummer, StringComparison.Ordinal))
            return true;

        if (!string.Equals(current.EmpfaengerPlz, request.EmpfaengerPlz, StringComparison.Ordinal))
            return true;

        if (!string.Equals(current.EmpfaengerOrt, request.EmpfaengerOrt, StringComparison.Ordinal))
            return true;

        return ArePositionsDifferent(existingPositions, request.Positionen);
    }

    private static bool ArePositionsDifferent(
        List<RechnungspositionEntity> existingPositions,
        List<CreateUpdateRechnungspositionRequest> requestPositions)
    {
        if (existingPositions.Count != requestPositions.Count)
            return true;

        var left = existingPositions.OrderBy(p => p.Nummer).ToList();
        var right = requestPositions.OrderBy(p => p.Nummer).ToList();

        for (var i = 0; i < left.Count; i++)
        {
            var existing = left[i];
            var requested = right[i];

            if (existing.Nummer != requested.Nummer)
                return true;

            if (!string.Equals(existing.Titel, requested.Titel, StringComparison.Ordinal))
                return true;

            if (!string.Equals(existing.Beschreibung, requested.Beschreibung, StringComparison.Ordinal))
                return true;

            if (!string.Equals(existing.Einheit, requested.Einheit, StringComparison.Ordinal))
                return true;

            if (existing.Anzahl != requested.Anzahl)
                return true;

            if (existing.PreisProEinheit != requested.PreisProEinheit)
                return true;
        }

        return false;
    }

    private static RechnungDto ToDto(RechnungEntity e, List<RechnungspositionEntity> positions) =>
        new(
            e.Id,
            e.UserId,
            e.RechnungsprofilId,
            e.Rechnungsnummer,
            e.Titel,
            e.Beschreibung,
            e.Status,
            e.RechnungsDatum,
            e.EmpfaengerName,
            e.EmpfaengerStrasse,
            e.EmpfaengerHausnummer,
            e.EmpfaengerPlz,
            e.EmpfaengerOrt,
            positions.Select(p => new RechnungspositionDto(
                p.Id,
                p.Nummer,
                p.Titel,
                p.Beschreibung,
                p.Einheit,
                p.Anzahl,
                p.PreisProEinheit,
                Math.Round(p.Anzahl * p.PreisProEinheit, 2))).ToList(),
            e.CreatedAt,
            e.UpdatedAt);
}
