namespace EaglesJungscharen.Azure.BillingTool.Models.Entities;

public class RechnungspositionEntity
{
    public required string Id { get; set; }
    public int Nummer { get; set; }
    public required string Titel { get; set; }
    public string? Beschreibung { get; set; }
    public required string Einheit { get; set; }
    public double Anzahl { get; set; }
    public double PreisProEinheit { get; set; }
}
