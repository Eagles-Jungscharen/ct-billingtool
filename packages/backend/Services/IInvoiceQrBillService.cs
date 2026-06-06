using EaglesJungscharen.Azure.BillingTool.Models;
using EaglesJungscharen.Azure.BillingTool.Models.Entities;

namespace EaglesJungscharen.Azure.BillingTool.Services;

public interface IInvoiceQrBillService
{
    Task TryGenerateAndStoreAsync(
        RechnungEntity invoice,
        List<RechnungspositionEntity> positions,
        CancellationToken cancellationToken = default);

    Task<QrBillFileResult?> TryGetStoredAsync(string invoiceId, CancellationToken cancellationToken = default);
}
