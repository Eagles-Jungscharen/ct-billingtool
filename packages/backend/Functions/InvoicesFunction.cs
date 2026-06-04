using System.Security.Claims;
using EaglesJungscharen.Azure.BillingTool.Models.Dtos;
using EaglesJungscharen.Azure.BillingTool.Models.Requests;
using EaglesJungscharen.Azure.BillingTool.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace EaglesJungscharen.Azure.BillingTool.Functions;

public class InvoicesFunction(
    IMeService meService,
    IInvoiceService invoiceService,
    ILogger<InvoicesFunction> logger)
{
    private readonly IMeService _meService = meService;
    private readonly IInvoiceService _invoiceService = invoiceService;
    private readonly ILogger<InvoicesFunction> _logger = logger;

    [Function("Invoices_GetAll")]
    public async Task<IActionResult> GetAll(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "invoices")] HttpRequest req) =>
        await ExecuteAsUserAsync(req, async (_, meDto) =>
        {
            var invoices = await _invoiceService.GetAllAsync(meDto.UserId, meDto.IsAdmin);
            _logger.LogInformation("{Count} Rechnung(en) geladen für UserId={UserId} (isAdmin={IsAdmin}).",
                invoices.Count, meDto.UserId, meDto.IsAdmin);
            return new OkObjectResult(invoices);
        });

    [Function("Invoices_GetById")]
    public async Task<IActionResult> GetById(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "invoices/{id}")] HttpRequest req,
        string id) =>
        await ExecuteAsUserAsync(req, async (_, meDto) =>
        {
            var invoice = await _invoiceService.GetByIdAsync(id, meDto.UserId, meDto.IsAdmin);
            if (invoice is null)
                return new ObjectResult(new ErrorRecord("Die Rechnung wurde nicht gefunden.", 2100))
                { StatusCode = StatusCodes.Status404NotFound };

            return new OkObjectResult(invoice);
        });

    [Function("Invoices_Create")]
    public async Task<IActionResult> Create(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "invoices")] HttpRequest req) =>
        await ExecuteAsUserAsync(req, async (req, meDto) =>
        {
            var request = await req.ReadFromJsonAsync<CreateUpdateRechnungRequest>();
            if (request is null || string.IsNullOrWhiteSpace(request.Titel))
                return new ObjectResult(new ErrorRecord("Ungültige Anfrage. Titel ist ein Pflichtfeld.", 2200))
                { StatusCode = StatusCodes.Status400BadRequest };

            var invoice = await _invoiceService.CreateAsync(meDto.UserId, request);
            _logger.LogInformation("Rechnung {Id} erstellt für UserId={UserId}.", invoice.Id, meDto.UserId);
            return new ObjectResult(invoice) { StatusCode = StatusCodes.Status201Created };
        });

    [Function("Invoices_Update")]
    public async Task<IActionResult> Update(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "invoices/{id}")] HttpRequest req,
        string id) =>
        await ExecuteAsUserAsync(req, async (req, meDto) =>
        {
            var request = await req.ReadFromJsonAsync<CreateUpdateRechnungRequest>();
            if (request is null || string.IsNullOrWhiteSpace(request.Titel))
                return new ObjectResult(new ErrorRecord("Ungültige Anfrage. Titel ist ein Pflichtfeld.", 2200))
                { StatusCode = StatusCodes.Status400BadRequest };

            var invoice = await _invoiceService.UpdateAsync(id, meDto.UserId, meDto.IsAdmin, request);
            if (invoice is null)
                return new ObjectResult(new ErrorRecord("Die Rechnung wurde nicht gefunden oder gehört einem anderen Benutzer.", 2101))
                { StatusCode = StatusCodes.Status404NotFound };

            _logger.LogInformation("Rechnung {Id} aktualisiert.", id);
            return new OkObjectResult(invoice);
        });

    [Function("Invoices_Delete")]
    public async Task<IActionResult> Delete(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "invoices/{id}")] HttpRequest req,
        string id) =>
        await ExecuteAsUserAsync(req, async (_, meDto) =>
        {
            var deleted = await _invoiceService.DeleteAsync(id, meDto.UserId, meDto.IsAdmin);
            if (!deleted)
                return new ObjectResult(new ErrorRecord("Die Rechnung wurde nicht gefunden oder gehört einem anderen Benutzer.", 2101))
                { StatusCode = StatusCodes.Status404NotFound };

            _logger.LogInformation("Rechnung {Id} gelöscht.", id);
            return new NoContentResult();
        });

    // Auth-Guard: 401 wenn nicht authentifiziert, sonst Handler ausführen
    private async Task<IActionResult> ExecuteAsUserAsync(
        HttpRequest req,
        Func<HttpRequest, MeDto, Task<IActionResult>> handler)
    {
        var userId = req.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? req.HttpContext.User.FindFirstValue("sub");

        if (string.IsNullOrWhiteSpace(userId))
            return new ObjectResult(new ErrorRecord("Nicht authentifiziert.", 1001))
            { StatusCode = StatusCodes.Status401Unauthorized };

        var meDto = await _meService.GetMeDtoAsync(req.HttpContext.User, userId);

        try
        {
            return await handler(req, meDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unerwarteter Fehler beim Verarbeiten der Anfrage.");
            return new ObjectResult(new ErrorRecord("Ein interner Fehler ist aufgetreten.", 1000))
            { StatusCode = StatusCodes.Status500InternalServerError };
        }
    }
}
