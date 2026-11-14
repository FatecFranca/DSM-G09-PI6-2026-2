using System.Security.Claims;
using Livros.Api.Configuracoes;
using Livros.Api.Controllers;
using Livros.Api.Mensageria;
using Livros.Dominio.Entidades;
using Livros.Api.Services;
using Livros.Api.Testes.Fakes;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Livros.Api.Testes.Controllers;

public class LivrosControllerTestes
{
    private readonly PublicadorFalso _publicador = new();

    private LivrosController CriarController(ClaimsPrincipal usuario) =>
        new(new LivrosService(BancoEmMemoria.Criar()), Options.Create(new OpcoesDaApi()), _publicador)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = usuario } }
        };

    private static ClaimsPrincipal UsuarioLogado(long id) =>
        new(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, id.ToString())], "Cookies"));

    private static ClaimsPrincipal Anonimo() => new(new ClaimsIdentity());

    [Fact]
    public async Task Detalhe_UsuarioLogado_PublicaVisualizacao()
    {
        var controller = CriarController(UsuarioLogado(BancoEmMemoria.IdUsuario));

        await controller.GetLivroPorId(BancoEmMemoria.IdLivro, CancellationToken.None);

        var evento = Assert.Single(_publicador.Publicados);
        Assert.Equal(TiposDeInteracao.Visualizacao, evento.Tipo);
        Assert.Equal(BancoEmMemoria.IdUsuario, evento.IdUsuario);
        Assert.Equal(BancoEmMemoria.IdLivro, evento.IdLivro);
    }

    [Fact]
    public async Task Detalhe_Anonimo_NaoPublica()
    {
        var controller = CriarController(Anonimo());

        var resposta = await controller.GetLivroPorId(BancoEmMemoria.IdLivro, CancellationToken.None);

        Assert.NotNull(resposta.Value);
        Assert.Empty(_publicador.Publicados);
    }

    [Fact]
    public async Task Detalhe_LivroInexistente_NaoPublica()
    {
        var controller = CriarController(UsuarioLogado(BancoEmMemoria.IdUsuario));

        await controller.GetLivroPorId(999, CancellationToken.None);

        Assert.Empty(_publicador.Publicados);
    }
}
