using EaglesJungscharen.Azure.BillingTool.Models.Dtos;
using EaglesJungscharen.Azure.BillingTool.Models.Entities;
using EaglesJungscharen.Azure.BillingTool.Models.Requests;
using GuedesPlace.AzureTools.Tables;
using Microsoft.Extensions.DependencyInjection;

namespace EaglesJungscharen.Azure.BillingTool.Services;

public class InvoiceProfileService(
    [FromKeyedServices("BillingStorage")] ExtendedAzureTableClientService tableService) : IInvoiceProfileService
{
    private const string PartitionKey = "RechnungsProfil";
    private readonly TypedAzureTableClient<RechnungsprofilEntity> _table =
        tableService.GetTypedTableClient<RechnungsprofilEntity>();

    public async Task<List<RechnungsprofilDto>> GetAllAsync()
    {
        var results = await _table.GetAllAsync(PartitionKey);
        return results.Select(r => ToDto(r.Entity)).ToList();
    }

    public async Task<RechnungsprofilDto> CreateAsync(CreateUpdateRechnungsprofilRequest request)
    {
        var entity = new RechnungsprofilEntity
        {
            Id = Guid.NewGuid().ToString(),
            Name = request.Name,
            Iban = request.Iban,
            AbsenderName = request.AbsenderName,
            Strasse = request.Strasse,
            Hausnummer = request.Hausnummer,
            Plz = request.Plz,
            Ort = request.Ort,
        };
        await _table.InsertOrReplaceAsync(rowKey: entity.Id, partitionKey: PartitionKey, entity);
        return ToDto(entity);
    }

    public async Task<RechnungsprofilDto?> UpdateAsync(string id, CreateUpdateRechnungsprofilRequest request)
    {
        var existing = await _table.GetByIdAsync(id, PartitionKey);
        if (existing is null)
            return null;

        var entity = existing.Entity;
        entity.Name = request.Name;
        entity.Iban = request.Iban;
        entity.AbsenderName = request.AbsenderName;
        entity.Strasse = request.Strasse;
        entity.Hausnummer = request.Hausnummer;
        entity.Plz = request.Plz;
        entity.Ort = request.Ort;

        await _table.InsertOrReplaceAsync(rowKey: entity.Id, partitionKey: PartitionKey, entity);
        return ToDto(entity);
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var existing = await _table.GetByIdAsync(id, PartitionKey);
        if (existing is null)
            return false;

        await _table.DeleteEntityAsync(rowKey: id, partitionKey: PartitionKey);
        return true;
    }

    private static RechnungsprofilDto ToDto(RechnungsprofilEntity e) =>
        new(e.Id, e.Name, e.Iban, e.AbsenderName, e.Strasse, e.Hausnummer, e.Plz, e.Ort);
}
