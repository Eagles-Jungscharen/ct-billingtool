namespace EaglesJungscharen.Azure.BillingTool.Models.Entities;

public class RechnungEntity
{
    public required string Id { get; set; }
    public required string UserId { get; set; }
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
    public required string CreatedAt { get; set; }
    public required string UpdatedAt { get; set; }
}
