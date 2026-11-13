using System.Security.Claims;
using Livros.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Livros.Api.Controllers;

[ApiController]
[Authorize]
[Route("usuarios/{idUsuario:long}/livros-salvos")]
[Tags("Livros salvos")]
public class LivrosSalvosController(LivrosSalvosService servico) : ControllerBase
{
    // O identificador na URL so e aceito quando pertence ao usuario da sessao.
    private bool EhTitular(long idUsuario) =>
        long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var idAutenticado)
        && idUsuario == idAutenticado;

    [HttpGet]
    public async Task<IActionResult> Listar(long idUsuario, CancellationToken cancelamento)
    {
        if (!EhTitular(idUsuario)) return Forbid();
        var salvos = await servico.ListarAsync(idUsuario, cancelamento);
        return salvos is null ? NotFound(new { mensagem = "Usuario nao encontrado" }) : Ok(salvos);
    }

    [HttpPost("{idLivro:long}")]
    public async Task<IActionResult> Salvar(long idUsuario, long idLivro, CancellationToken cancelamento)
    {
        if (!EhTitular(idUsuario)) return Forbid();
        if (idLivro <= 0) return BadRequest();
        var (resultado, salvo) = await servico.SalvarAsync(idUsuario, idLivro, cancelamento);
        return resultado switch
        {
            ResultadoSalvo.UsuarioNaoEncontrado => NotFound(new { mensagem = "Usuario nao encontrado" }),
            ResultadoSalvo.LivroNaoEncontrado => NotFound(new { mensagem = "Livro nao encontrado" }),
            ResultadoSalvo.JaExistia => Ok(salvo),
            _ => Created($"/usuarios/{idUsuario}/livros-salvos", salvo)
        };
    }

    [HttpDelete("{idLivro:long}")]
    public async Task<IActionResult> Remover(long idUsuario, long idLivro, CancellationToken cancelamento)
    {
        if (!EhTitular(idUsuario)) return Forbid();
        if (idLivro <= 0) return BadRequest();
        var resultado = await servico.RemoverAsync(idUsuario, idLivro, cancelamento);
        return resultado switch
        {
            ResultadoSalvo.UsuarioNaoEncontrado => NotFound(new { mensagem = "Usuario nao encontrado" }),
            ResultadoSalvo.NaoEncontrado => NotFound(new { mensagem = "Livro nao esta salvo" }),
            _ => NoContent()
        };
    }
}
