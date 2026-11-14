using System.Security.Claims;
using Livros.Api.Controllers;
using Livros.Api.Dtos;
using Livros.Api.Services;
using Livros.Api.Testes.Fakes;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Livros.Api.Testes.Controllers;

public class AvaliacoesControllerTestes
{
    private readonly AvaliacoesController _controller = new(new AvaliacoesService(BancoEmMemoria.Criar()))
    {
        ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                    [new Claim(ClaimTypes.NameIdentifier, BancoEmMemoria.IdUsuario.ToString())], "Cookies"))
            }
        }
    };

    [Fact]
    public async Task Put_NotaValida_Retorna200ComNota()
    {
        var resposta = await _controller.Avaliar(BancoEmMemoria.IdLivro, new AvaliarDto(5), CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(resposta);
        Assert.Equal(new AvaliacaoDto(5), ok.Value);
    }

    [Fact]
    public async Task Put_NotaInvalida_Retorna400()
    {
        var resposta = await _controller.Avaliar(BancoEmMemoria.IdLivro, new AvaliarDto(0), CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(resposta);
    }

    [Fact]
    public async Task Put_LivroInexistente_Retorna404()
    {
        var resposta = await _controller.Avaliar(999, new AvaliarDto(3), CancellationToken.None);

        Assert.IsType<NotFoundObjectResult>(resposta);
    }

    [Fact]
    public async Task Get_SemNota_RetornaNotaNula()
    {
        var resposta = await _controller.Obter(BancoEmMemoria.IdLivro, CancellationToken.None);

        Assert.Equal(new AvaliacaoDto(null), resposta.Value);
    }

    [Fact]
    public async Task Delete_SemNota_Retorna404()
    {
        var resposta = await _controller.Remover(BancoEmMemoria.IdLivro, CancellationToken.None);

        Assert.IsType<NotFoundObjectResult>(resposta);
    }

    [Fact]
    public async Task Delete_ComNota_Retorna204()
    {
        await _controller.Avaliar(BancoEmMemoria.IdLivro, new AvaliarDto(4), CancellationToken.None);

        var resposta = await _controller.Remover(BancoEmMemoria.IdLivro, CancellationToken.None);

        Assert.IsType<NoContentResult>(resposta);
    }
}
