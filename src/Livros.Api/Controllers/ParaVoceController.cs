using System.Security.Claims;
using Livros.Api.Dtos;
using Livros.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Livros.Api.Controllers;

[ApiController]
[Authorize]
[Route("usuarios/me/para-voce")]
[Tags("Recomendacoes")]
public class ParaVoceController(ParaVoceService servico) : ControllerBase
{
    private const int TotalPadrao = 20;

    [HttpGet]
    public async Task<ActionResult<ParaVoceDto>> Obter([FromQuery] int? total = null, CancellationToken cancelamento = default)
    {
        var idUsuario = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return await servico.GerarAsync(idUsuario, Math.Clamp(total ?? TotalPadrao, 1, 50), cancelamento);
    }
}
