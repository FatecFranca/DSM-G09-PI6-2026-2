using Livros.Dados;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Livros.Api.Controllers;

[ApiController]
[Route("saude")]
[Tags("Infra")]
public class SaudeController(ContextoLivros contexto) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetSaude(CancellationToken cancelamento)
    {
        var bancoOk = await contexto.Database.CanConnectAsync(cancelamento);

        var totalDeSimilares = bancoOk
            ? await contexto.LivrosSimilares.AsNoTracking().CountAsync(cancelamento)
            : 0;

        return Ok(new
        {
            banco = bancoOk ? "ok" : "indisponivel",
            recomendacoes_calculadas = totalDeSimilares > 0,
            pares_de_similaridade = totalDeSimilares,
        });
    }
}
