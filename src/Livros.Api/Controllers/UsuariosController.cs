using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Livros.Api.Configuracoes;
using Livros.Api.Dtos;
using Livros.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Livros.Api.Controllers;

[ApiController]
[Authorize]
[Route("usuarios")]
[Tags("Usuarios")]
public class UsuariosController(UsuariosService servico, AutenticacaoService autenticacao, IOptions<OpcoesDaApi> opcoes) : ControllerBase
{
    private readonly OpcoesDaApi _opcoes = opcoes.Value;

    // A listagem completa de contas nao fica disponivel a usuarios comuns.
    [Authorize(Roles = "Administrador")]
    [HttpGet]
    public async Task<ActionResult<PaginaDto<UsuarioDto>>> GetUsuarios(
        [FromQuery] int pagina = 1,
        [FromQuery] int? tamanhoPagina = null,
        [FromQuery] string? busca = null,
        CancellationToken cancelamento = default)
    {
        pagina = Math.Max(pagina, 1);
        var tamanho = _opcoes.NormalizarTamanhoPagina(tamanhoPagina);

        var (usuarios, total) = await servico.GetUsuariosAsync(pagina, tamanho, busca, cancelamento);

        return PaginaDto<UsuarioDto>.Montar(
            usuarios.Select(usuario => usuario.ParaDto()).ToList(),
            total,
            pagina,
            tamanho);
    }

    [HttpGet("{idUsuario:long}")]
    public async Task<ActionResult<UsuarioDto>> GetUsuarioPorId(long idUsuario, CancellationToken cancelamento)
    {
        if (!EhTitular(idUsuario)) return Forbid();
        var usuario = await servico.GetUsuarioPorIdAsync(idUsuario, cancelamento);
        if (usuario is null)
        {
            return NaoEncontrado(idUsuario);
        }

        return usuario.ParaDto();
    }

    // Mantido para compatibilidade com o CRUD. Prefira POST /auth/cadastro,
    // que tambem inicia a sessao.
    [AllowAnonymous]
    [EnableRateLimiting("entrada")]
    [HttpPost]
    public async Task<ActionResult<UsuarioDto>> PostUsuario(
        [FromBody] CriarUsuarioDto dados,
        CancellationToken cancelamento)
    {
        var (criado, usuario) = await autenticacao.CadastrarAsync(dados, cancelamento);

        if (!criado)
        {
            return EmailEmUso();
        }

        return CreatedAtAction(
            nameof(GetUsuarioPorId),
            new { idUsuario = usuario!.IdUsuario },
            usuario.ParaDto());
    }

    [HttpPut("{idUsuario:long}")]
    public async Task<ActionResult<UsuarioDto>> PutUsuario(
        long idUsuario,
        [FromBody] AtualizarUsuarioDto dados,
        CancellationToken cancelamento)
    {
        if (!EhTitular(idUsuario)) return Forbid();
        var (resultado, usuario) = await servico.AtualizarUsuarioAsync(idUsuario, dados, cancelamento);

        return resultado switch
        {
            ResultadoDeUsuario.NaoEncontrado => NaoEncontrado(idUsuario),
            ResultadoDeUsuario.EmailEmUso => EmailEmUso(),
            _ => usuario!.ParaDto(),
        };
    }

    [HttpPut("{idUsuario:long}/senha")]
    public async Task<IActionResult> PutSenha(
        long idUsuario,
        [FromBody] AlterarSenhaDto dados,
        CancellationToken cancelamento)
    {
        if (!EhTitular(idUsuario)) return Forbid();
        var resultado = await servico.AlterarSenhaAsync(idUsuario, dados, cancelamento);

        return resultado switch
        {
            ResultadoDeUsuario.NaoEncontrado => NaoEncontrado(idUsuario),
            ResultadoDeUsuario.SenhaAtualIncorreta => BadRequest(new ProblemDetails
            {
                Title = "a senha atual esta incorreta",
                Status = StatusCodes.Status400BadRequest,
            }),
            _ => NoContent(),
        };
    }

    [HttpDelete("{idUsuario:long}")]
    public async Task<IActionResult> DeleteUsuario(long idUsuario, CancellationToken cancelamento)
    {
        if (!EhTitular(idUsuario)) return Forbid();
        var resultado = await servico.RemoverUsuarioAsync(idUsuario, cancelamento);

        if (resultado == ResultadoDeUsuario.NaoEncontrado) return NaoEncontrado(idUsuario);
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    private bool EhTitular(long idUsuario) =>
        long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var atual) && atual == idUsuario;

    private NotFoundObjectResult NaoEncontrado(long idUsuario) =>
        NotFound(new ProblemDetails
        {
            Title = $"usuario {idUsuario} nao encontrado",
            Status = StatusCodes.Status404NotFound,
        });

    private ConflictObjectResult EmailEmUso() =>
        Conflict(new ProblemDetails
        {
            Title = "ja existe um usuario com esse email",
            Status = StatusCodes.Status409Conflict,
        });
}
