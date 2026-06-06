using EaglesJungscharen.Azure.BillingTool.Models.Dtos;
using EaglesJungscharen.Azure.BillingTool.Models;
using EaglesJungscharen.Azure.BillingTool.Models.Requests;

namespace EaglesJungscharen.Azure.BillingTool.Services;

public interface IInvoiceService
{
    Task<List<RechnungDto>> GetAllAsync(string userId, bool isAdmin);
    Task<RechnungDto?> GetByIdAsync(string id, string userId, bool isAdmin);
    Task<RechnungDto> CreateAsync(string userId, CreateUpdateRechnungRequest request);
    Task<RechnungDto?> UpdateAsync(string id, string userId, bool isAdmin, CreateUpdateRechnungRequest request);
    Task<QrBillFileResult?> GetQrBillAsync(string id, string userId, bool isAdmin);
    Task<bool> DeleteAsync(string id, string userId, bool isAdmin);
}
