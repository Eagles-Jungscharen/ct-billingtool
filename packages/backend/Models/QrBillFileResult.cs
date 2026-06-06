namespace EaglesJungscharen.Azure.BillingTool.Models;

public record QrBillFileResult(
    byte[] Content,
    string ContentType,
    string FileName);
