using Livros.Api.Configuracoes;
using Livros.Api.Dtos;
using Livros.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Livros.Api.Controllers;

[ApiController]
[Route("livros")]
[Tags("Recomendacoes")]
public class RecomendacoesController(
    LivrosService livrosServico,
    RecomendacoesService recomendacoesServico,
    IOptions<OpcoesDaApi> opcoes) : ControllerBase
{
    private readonly OpcoesDaApi _opcoes = opcoes.Value;

    [HttpGet("{idLivro:long}/recomendacoes")]
    public async Task<ActionResult<RecomendacoesDto>> GetRecomendacoes(
        long idLivro,
        [FromQuery] int? total = null,
        CancellationToken cancelamento = default)
    {
        var quantidade = Math.Clamp(total ?? _opcoes.TotalRecomendacoes, 1, 50);

        var livro = await livrosServico.GetLivroPorIdAsync(idLivro, cancelamento);
        if (livro is null)
        {
            return NotFound(new ProblemDetails { Title = $"livro {idLivro} nao encontrado", Status = 404 });
        }

        var (origem, similares) = await recomendacoesServico.GetRecomendacoesAsync(livro, quantidade, cancelamento);

        var livrosPorId = await livrosServico.GetLivrosPorIdsAsync(
            similares.Select(similar => similar.IdLivro).ToList(),
            cancelamento);

        var recomendacoes = new List<RecomendacaoDto>(similares.Count);
        var posicao = 0;
        foreach (var similar in similares)
        {
            if (!livrosPorId.TryGetValue(similar.IdLivro, out var livroSimilar))
            {
                continue;
            }

            posicao++;
            recomendacoes.Add(new RecomendacaoDto(livroSimilar.ParaResumo(), Math.Round(similar.Score, 6), posicao));
        }

        return new RecomendacoesDto(idLivro, origem, recomendacoes);
    }
}
