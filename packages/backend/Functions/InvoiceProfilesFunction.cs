using EaglesJungscharen.Azure.BillingTool.Models.Dtos;
using EaglesJungscharen.Azure.BillingTool.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System.Security.Claims;

namespace EaglesJungscharen.Azure.BillingTool.Functions;

public class InvoiceProfilesFunction(
    IInvoiceProfileService profileService,
    ILogger<InvoiceProfilesFunction> logger)
{
    private readonly IInvoiceProfileService _profileService = profileService;
    private readonly ILogger<InvoiceProfilesFunction> _logger = logger;

    [Function("InvoiceProfiles_GetAll")]
    public async Task<IActionResult> GetAll(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "invoice-profiles")] HttpRequest req)
    {
        var userId = req.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? req.HttpContext.User.FindFirstValue("sub");

        if (string.IsNullOrWhiteSpace(userId))
            return new ObjectResult(new ErrorRecord("Nicht authentifiziert.", 1001))
            { StatusCode = StatusCodes.Status401Unauthorized };

        var profiles = await _profileService.GetAllAsync();
        _logger.LogInformation("{Count} Rechnungsprofil(e) geladen.", profiles.Count);
        return new OkObjectResult(profiles);
    }
}
