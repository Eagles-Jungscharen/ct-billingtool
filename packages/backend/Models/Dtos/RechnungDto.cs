namespace EaglesJungscharen.Azure.BillingTool.Models.Dtos;

public record RechnungDto(
    string Id,
    string UserId,
    string RechnungsprofilId,
    string Rechnungsnummer,
    string Titel,
    string? Beschreibung,
    string Status,
    string? RechnungsDatum,
    string EmpfaengerName,
    string EmpfaengerStrasse,
    string EmpfaengerHausnummer,
    string EmpfaengerPlz,
    string EmpfaengerOrt,
    List<RechnungspositionDto> Positionen,
    string CreatedAt,
    string UpdatedAt);
