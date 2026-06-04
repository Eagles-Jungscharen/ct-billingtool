namespace EaglesJungscharen.Azure.BillingTool.Models.Entities;

public class RechnungsprofilEntity
{
    public required string Id { get; set; }
    public required string Name { get; set; }
    public required string Iban { get; set; }
    public required string AbsenderName { get; set; }
    public required string Strasse { get; set; }
    public required string Hausnummer { get; set; }
    public required string Plz { get; set; }
    public required string Ort { get; set; }
}
