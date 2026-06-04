namespace EaglesJungscharen.Azure.BillingTool.Models.Requests;

public class CreateUpdateRechnungRequest
{
    public required string RechnungsprofilId { get; set; }
    public required string Rechnungsnummer { get; set; }
    public required string Titel { get; set; }
    public string? Beschreibung { get; set; }
    public required string Status { get; set; }
    public string? RechnungsDatum { get; set; }
    public required string EmpfaengerName { get; set; }
    public required string EmpfaengerStrasse { get; set; }
    public required string EmpfaengerHausnummer { get; set; }
    public required string EmpfaengerPlz { get; set; }
    public required string EmpfaengerOrt { get; set; }
    public List<CreateUpdateRechnungspositionRequest> Positionen { get; set; } = [];
}
