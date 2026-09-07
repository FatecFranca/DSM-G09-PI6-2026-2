using Livros.Api.Configuracoes;
using Livros.Api.Dtos;
using Livros.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Livros.Api.Controllers;

[ApiController]
[Route("livros")]
[Tags("Livros")]
public class LivrosController(LivrosService servico, IOptions<OpcoesDaApi> opcoes) : ControllerBase
{
    private readonly OpcoesDaApi _opcoes = opcoes.Value;

    [HttpGet]
    public async Task<ActionResult<PaginaDto<LivroResumoDto>>> GetLivros(
        [FromQuery] int pagina = 1,
        [FromQuery] int? tamanhoPagina = null,
        [FromQuery] string? categoria = null,
        [FromQuery] string? busca = null,
        CancellationToken cancelamento = default)
    {
        pagina = Math.Max(pagina, 1);
        var tamanho = _opcoes.NormalizarTamanhoPagina(tamanhoPagina);

        var (livros, total) = await servico.GetLivrosAsync(pagina, tamanho, categoria, busca, cancelamento);

        return PaginaDto<LivroResumoDto>.Montar(
            livros.Select(livro => livro.ParaResumo()).ToList(),
            total,
            pagina,
            tamanho);
    }

    [HttpGet("{idLivro:long}")]
    public async Task<ActionResult<LivroDetalheDto>> GetLivroPorId(long idLivro, CancellationToken cancelamento)
    {
        var livro = await servico.GetLivroPorIdAsync(idLivro, cancelamento);
        if (livro is null)
        {
            return NotFound(new ProblemDetails { Title = $"livro {idLivro} nao encontrado", Status = 404 });
        }

        return livro.ParaDetalhe();
    }
}
