using System.Security.Claims;
using EaglesJungscharen.Azure.BillingTool.Models.Dtos;

namespace EaglesJungscharen.Azure.BillingTool.Services;

public interface IMeService
{
    Task<MeDto> GetMeDtoAsync(ClaimsPrincipal user, string userId);
}
