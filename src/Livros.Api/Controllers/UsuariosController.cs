using Livros.Api.Configuracoes;
using Livros.Api.Dtos;
using Livros.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Livros.Api.Controllers;

[ApiController]
[Route("usuarios")]
[Tags("Usuarios")]
public class UsuariosController(UsuariosService servico, IOptions<OpcoesDaApi> opcoes) : ControllerBase
{
    private readonly OpcoesDaApi _opcoes = opcoes.Value;

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
        var usuario = await servico.GetUsuarioPorIdAsync(idUsuario, cancelamento);
        if (usuario is null)
        {
            return NaoEncontrado(idUsuario);
        }

        return usuario.ParaDto();
    }

    [HttpPost]
    public async Task<ActionResult<UsuarioDto>> PostUsuario(
        [FromBody] CriarUsuarioDto dados,
        CancellationToken cancelamento)
    {
        var (resultado, usuario) = await servico.CriarUsuarioAsync(dados, cancelamento);

        if (resultado == ResultadoDeUsuario.EmailEmUso)
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
        var resultado = await servico.RemoverUsuarioAsync(idUsuario, cancelamento);

        return resultado == ResultadoDeUsuario.NaoEncontrado ? NaoEncontrado(idUsuario) : NoContent();
    }

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
