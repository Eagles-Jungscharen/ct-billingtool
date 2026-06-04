namespace EaglesJungscharen.Azure.BillingTool.Models.Dtos;

public record RechnungsprofilDto(
    string Id,
    string Name,
    string Iban,
    string AbsenderName,
    string Strasse,
    string Hausnummer,
    string Plz,
    string Ort);
