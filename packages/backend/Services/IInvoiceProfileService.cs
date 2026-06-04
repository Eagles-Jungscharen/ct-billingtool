using EaglesJungscharen.Azure.BillingTool.Models.Dtos;
using EaglesJungscharen.Azure.BillingTool.Models.Requests;

namespace EaglesJungscharen.Azure.BillingTool.Services;

public interface IInvoiceProfileService
{
    Task<List<RechnungsprofilDto>> GetAllAsync();
    Task<RechnungsprofilDto> CreateAsync(CreateUpdateRechnungsprofilRequest request);
    Task<RechnungsprofilDto?> UpdateAsync(string id, CreateUpdateRechnungsprofilRequest request);
    Task<bool> DeleteAsync(string id);
}
