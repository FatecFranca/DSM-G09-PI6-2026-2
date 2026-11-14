using Livros.Api.Mensageria;
using Livros.Dominio.Entidades;
using Livros.Api.Services;
using Livros.Api.Testes.Fakes;

namespace Livros.Api.Testes.Services;

public class LivrosSalvosServiceTestes
{
    private readonly PublicadorFalso _publicador = new();
    private readonly LivrosSalvosService _servico;

    public LivrosSalvosServiceTestes()
    {
        _servico = new LivrosSalvosService(BancoEmMemoria.Criar(), _publicador);
    }

    [Fact]
    public async Task Salvar_Novo_PublicaSalvou()
    {
        await _servico.SalvarAsync(BancoEmMemoria.IdUsuario, BancoEmMemoria.IdLivro, CancellationToken.None);

        var evento = Assert.Single(_publicador.Publicados);
        Assert.Equal(TiposDeInteracao.Salvou, evento.Tipo);
        Assert.Equal(BancoEmMemoria.IdUsuario, evento.IdUsuario);
        Assert.Equal(BancoEmMemoria.IdLivro, evento.IdLivro);
    }

    [Fact]
    public async Task Salvar_JaExistia_NaoPublica()
    {
        await _servico.SalvarAsync(BancoEmMemoria.IdUsuario, BancoEmMemoria.IdLivro, CancellationToken.None);
        var (resultado, _) = await _servico.SalvarAsync(BancoEmMemoria.IdUsuario, BancoEmMemoria.IdLivro, CancellationToken.None);

        Assert.Equal(ResultadoSalvo.JaExistia, resultado);
        Assert.Single(_publicador.Publicados);
    }

    [Fact]
    public async Task Salvar_LivroInexistente_NaoPublica()
    {
        await _servico.SalvarAsync(BancoEmMemoria.IdUsuario, 999, CancellationToken.None);

        Assert.Empty(_publicador.Publicados);
    }

    [Fact]
    public async Task Remover_Existente_PublicaRemoveuSalvo()
    {
        await _servico.SalvarAsync(BancoEmMemoria.IdUsuario, BancoEmMemoria.IdLivro, CancellationToken.None);

        var resultado = await _servico.RemoverAsync(BancoEmMemoria.IdUsuario, BancoEmMemoria.IdLivro, CancellationToken.None);

        Assert.Equal(ResultadoSalvo.Removido, resultado);
        Assert.Equal(
            [TiposDeInteracao.Salvou, TiposDeInteracao.RemoveuSalvo],
            _publicador.Publicados.Select(evento => evento.Tipo));
    }

    [Fact]
    public async Task Remover_NaoSalvo_NaoPublica()
    {
        await _servico.RemoverAsync(BancoEmMemoria.IdUsuario, BancoEmMemoria.IdLivro, CancellationToken.None);

        Assert.Empty(_publicador.Publicados);
    }
}
