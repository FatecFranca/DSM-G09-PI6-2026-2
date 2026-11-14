using System.Security.Claims;
using Livros.Api.Dtos;
using Livros.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Livros.Api.Controllers;

// a nota e sempre do usuario da sessao, por isso o id dele nao vai na url
[ApiController]
[Authorize]
[Route("livros/{idLivro:long}/avaliacao")]
[Tags("Avaliacoes")]
public class AvaliacoesController(AvaliacoesService servico) : ControllerBase
{
    private long IdUsuario => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<AvaliacaoDto>> Obter(long idLivro, CancellationToken cancelamento) =>
        new AvaliacaoDto(await servico.ObterNotaAsync(IdUsuario, idLivro, cancelamento));

    [HttpPut]
    public async Task<IActionResult> Avaliar(long idLivro, [FromBody] AvaliarDto dados, CancellationToken cancelamento)
    {
        var resultado = await servico.AvaliarAsync(IdUsuario, idLivro, dados.Nota, cancelamento);
        return resultado switch
        {
            ResultadoAvaliacao.NotaInvalida => BadRequest(new { mensagem = "A nota deve ser de 1 a 5" }),
            ResultadoAvaliacao.LivroNaoEncontrado => NotFound(new { mensagem = "Livro nao encontrado" }),
            _ => Ok(new AvaliacaoDto(dados.Nota))
        };
    }

    [HttpDelete]
    public async Task<IActionResult> Remover(long idLivro, CancellationToken cancelamento)
    {
        var resultado = await servico.RemoverAsync(IdUsuario, idLivro, cancelamento);
        return resultado == ResultadoAvaliacao.NaoEncontrada
            ? NotFound(new { mensagem = "Livro sem nota" })
            : NoContent();
    }
}
