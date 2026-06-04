using System.Security.Claims;
using EaglesJungscharen.Azure.BillingTool.Models.Dtos;
using EaglesJungscharen.Azure.BillingTool.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace EaglesJungscharen.Azure.BillingTool.Functions;

public class MeFunction(
    IMemoryCache cache,
    IMeService meService,
    ILogger<MeFunction> logger)
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);
    private readonly IMemoryCache _cache = cache;
    private readonly IMeService _meService = meService;
    private readonly ILogger<MeFunction> _logger = logger;

    [Function("Me_Get")]
    public async Task<IActionResult> GetMe(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "me")] HttpRequest req)
    {
        var userId = req.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? req.HttpContext.User.FindFirstValue("sub");

        if (string.IsNullOrWhiteSpace(userId))
            return new ObjectResult(new ErrorRecord("Nicht authentifiziert.", 1001))
            { StatusCode = StatusCodes.Status401Unauthorized };

        var cacheKey = $"me_{userId}";
        if (_cache.TryGetValue(cacheKey, out MeDto? cached) && cached is not null)
        {
            _logger.LogInformation("MeDto für Benutzer {UserId} aus Cache geladen.", userId);
            return new OkObjectResult(cached);
        }

        var meDto = await _meService.GetMeDtoAsync(req.HttpContext.User, userId);
        _cache.Set(cacheKey, meDto, CacheTtl);
        _logger.LogInformation("MeDto für Benutzer {UserId} in Cache gespeichert (TTL: {Ttl}).", userId, CacheTtl);
        return new OkObjectResult(meDto);
    }
}
