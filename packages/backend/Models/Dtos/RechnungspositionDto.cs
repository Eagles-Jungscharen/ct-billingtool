namespace EaglesJungscharen.Azure.BillingTool.Models.Dtos;

public record RechnungspositionDto(
    string Id,
    int Nummer,
    string Titel,
    string? Beschreibung,
    string Einheit,
    double Anzahl,
    double PreisProEinheit,
    double PreisTotal);
