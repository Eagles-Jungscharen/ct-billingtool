using System.Security.Claims;
using EaglesJungscharen.Azure.BillingTool.Models.Dtos;
using EaglesJungscharen.Azure.BillingTool.Models.Requests;
using EaglesJungscharen.Azure.BillingTool.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace EaglesJungscharen.Azure.BillingTool.Functions;

public class InvoiceManagementFunction(
    IMeService meService,
    IInvoiceProfileService profileService,
    ILogger<InvoiceManagementFunction> logger)
{
    private readonly IMeService _meService = meService;
    private readonly IInvoiceProfileService _profileService = profileService;
    private readonly ILogger<InvoiceManagementFunction> _logger = logger;

    [Function("InvoiceManagement_CreateProfile")]
    public async Task<IActionResult> CreateProfile(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "invoice-management/invoice-profiles")] HttpRequest req) =>
        await ExecuteAsAdminAsync(req, async (req, _) =>
        {
            var request = await req.ReadFromJsonAsync<CreateUpdateRechnungsprofilRequest>();
            if (request is null || string.IsNullOrWhiteSpace(request.Name))
                return new ObjectResult(new ErrorRecord("Ungültige Anfrage. Name ist ein Pflichtfeld.", 2200))
                { StatusCode = StatusCodes.Status400BadRequest };

            var profile = await _profileService.CreateAsync(request);
            _logger.LogInformation("Rechnungsprofil '{Name}' erstellt: {Id}", profile.Name, profile.Id);
            return new ObjectResult(profile) { StatusCode = StatusCodes.Status201Created };
        });

    [Function("InvoiceManagement_UpdateProfile")]
    public async Task<IActionResult> UpdateProfile(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "invoice-management/invoice-profiles/{id}")] HttpRequest req,
        string id) =>
        await ExecuteAsAdminAsync(req, async (req, _) =>
        {
            var request = await req.ReadFromJsonAsync<CreateUpdateRechnungsprofilRequest>();
            if (request is null || string.IsNullOrWhiteSpace(request.Name))
                return new ObjectResult(new ErrorRecord("Ungültige Anfrage. Name ist ein Pflichtfeld.", 2200))
                { StatusCode = StatusCodes.Status400BadRequest };

            var profile = await _profileService.UpdateAsync(id, request);
            if (profile is null)
                return new ObjectResult(new ErrorRecord("Das Rechnungsprofil wurde nicht gefunden.", 2000))
                { StatusCode = StatusCodes.Status404NotFound };

            _logger.LogInformation("Rechnungsprofil {Id} aktualisiert.", id);
            return new OkObjectResult(profile);
        });

    [Function("InvoiceManagement_DeleteProfile")]
    public async Task<IActionResult> DeleteProfile(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "invoice-management/invoice-profiles/{id}")] HttpRequest req,
        string id) =>
        await ExecuteAsAdminAsync(req, async (_, _) =>
        {
            var deleted = await _profileService.DeleteAsync(id);
            if (!deleted)
                return new ObjectResult(new ErrorRecord("Das Rechnungsprofil wurde nicht gefunden.", 2000))
                { StatusCode = StatusCodes.Status404NotFound };

            _logger.LogInformation("Rechnungsprofil {Id} gelöscht.", id);
            return new NoContentResult();
        });

    // Auth-Guard: 401 wenn nicht authentifiziert, 403 wenn kein Admin, sonst Handler ausführen
    private async Task<IActionResult> ExecuteAsAdminAsync(
        HttpRequest req,
        Func<HttpRequest, MeDto, Task<IActionResult>> handler)
    {
        var userId = req.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? req.HttpContext.User.FindFirstValue("sub");

        if (string.IsNullOrWhiteSpace(userId))
            return new ObjectResult(new ErrorRecord("Nicht authentifiziert.", 1001))
            { StatusCode = StatusCodes.Status401Unauthorized };

        var meDto = await _meService.GetMeDtoAsync(req.HttpContext.User, userId);
        if (!meDto.IsAdmin)
            return new ObjectResult(new ErrorRecord("Zugriff verweigert. Admin-Berechtigung erforderlich.", 1002))
            { StatusCode = StatusCodes.Status403Forbidden };

        try
        {
            return await handler(req, meDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unerwarteter Fehler beim Ausführen eines Admin-Handlers.");
            return new ObjectResult(new ErrorRecord("Ein interner Fehler ist aufgetreten.", 1000))
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }
}
