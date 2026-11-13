using System.Security.Claims;
using Livros.Api.Dtos;
using Livros.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Livros.Api.Controllers;

[ApiController]
[Route("auth")]
[Tags("Autenticacao")]
public class AutenticacaoController(AutenticacaoService servico, UsuariosService usuarios) : ControllerBase
{
    [AllowAnonymous]
    [EnableRateLimiting("entrada")]
    [HttpPost("cadastro")]
    public async Task<IActionResult> Cadastrar([FromBody] CriarUsuarioDto dados, CancellationToken cancelamento)
    {
        var (criado, usuario) = await servico.CadastrarAsync(dados, cancelamento);
        if (!criado || usuario is null)
            return Conflict(new ProblemDetails { Title = "E-mail ja cadastrado", Status = 409 });
        await CriarSessaoAsync(usuario.IdUsuario, usuario.Nome, usuario.Email);
        return StatusCode(StatusCodes.Status201Created, usuario.ParaDto());
    }

    [AllowAnonymous]
    [EnableRateLimiting("entrada")]
    [HttpPost("entrar")]
    public async Task<IActionResult> Entrar([FromBody] EntrarDto dados, CancellationToken cancelamento)
    {
        var usuario = await servico.EntrarAsync(dados, cancelamento);
        if (usuario is null)
            return Unauthorized(new ProblemDetails { Title = "E-mail ou senha invalidos", Status = 401 });
        await CriarSessaoAsync(usuario.IdUsuario, usuario.Nome, usuario.Email);
        return Ok(usuario.ParaDto());
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Perfil(CancellationToken cancelamento)
    {
        if (!long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)) return Unauthorized();
        var usuario = await usuarios.GetUsuarioPorIdAsync(id, cancelamento);
        if (usuario is null)
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Unauthorized();
        }
        return Ok(usuario.ParaDto());
    }

    [Authorize]
    [HttpPost("sair")]
    public async Task<IActionResult> Sair()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    private Task CriarSessaoAsync(long id, string nome, string email)
    {
        var identidade = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, id.ToString()),
            new Claim(ClaimTypes.Name, nome),
            new Claim(ClaimTypes.Email, email)
        }, CookieAuthenticationDefaults.AuthenticationScheme);
        return HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identidade),
            new AuthenticationProperties { IsPersistent = false, AllowRefresh = false });
    }
}
