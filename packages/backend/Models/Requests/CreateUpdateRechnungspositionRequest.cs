namespace EaglesJungscharen.Azure.BillingTool.Models.Requests;

public class CreateUpdateRechnungspositionRequest
{
    public int Nummer { get; set; }
    public required string Titel { get; set; }
    public string? Beschreibung { get; set; }
    public required string Einheit { get; set; }
    public double Anzahl { get; set; }
    public double PreisProEinheit { get; set; }
}
