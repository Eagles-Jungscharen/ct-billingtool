namespace EaglesJungscharen.Azure.BillingTool.Models.Requests;

public class CreateUpdateRechnungsprofilRequest
{
    public required string Name { get; set; }
    public required string Iban { get; set; }
    public required string AbsenderName { get; set; }
    public required string Strasse { get; set; }
    public required string Hausnummer { get; set; }
    public required string Plz { get; set; }
    public required string Ort { get; set; }
}
