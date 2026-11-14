using Livros.Api.Services;
using Livros.Api.Testes.Fakes;
using Livros.Dados;

namespace Livros.Api.Testes.Services;

public class AvaliacoesServiceTestes
{
    private readonly ContextoLivros _contexto = BancoEmMemoria.Criar();
    private readonly AvaliacoesService _servico;

    public AvaliacoesServiceTestes()
    {
        _servico = new AvaliacoesService(_contexto);
    }

    private Task<int?> NotaAtual() =>
        _servico.ObterNotaAsync(BancoEmMemoria.IdUsuario, BancoEmMemoria.IdLivro, CancellationToken.None);

    private Task<ResultadoAvaliacao> Avaliar(int nota, long idLivro = BancoEmMemoria.IdLivro) =>
        _servico.AvaliarAsync(BancoEmMemoria.IdUsuario, idLivro, nota, CancellationToken.None);

    [Fact]
    public async Task Avaliar_Nova_GravaNota()
    {
        Assert.Equal(ResultadoAvaliacao.Salva, await Avaliar(4));

        Assert.Equal(4, await NotaAtual());
    }

    [Fact]
    public async Task Avaliar_Existente_AtualizaSemDuplicar()
    {
        await Avaliar(4);
        await Avaliar(2);

        Assert.Equal(2, await NotaAtual());
        Assert.Single(_contexto.Avaliacoes);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    public async Task Avaliar_NotaForaDaFaixa_NaoGrava(int nota)
    {
        Assert.Equal(ResultadoAvaliacao.NotaInvalida, await Avaliar(nota));

        Assert.Empty(_contexto.Avaliacoes);
    }

    [Fact]
    public async Task Avaliar_LivroInexistente()
    {
        Assert.Equal(ResultadoAvaliacao.LivroNaoEncontrado, await Avaliar(5, idLivro: 999));
    }

    [Fact]
    public async Task Remover_Existente()
    {
        await Avaliar(5);

        var resultado = await _servico.RemoverAsync(BancoEmMemoria.IdUsuario, BancoEmMemoria.IdLivro, CancellationToken.None);

        Assert.Equal(ResultadoAvaliacao.Removida, resultado);
        Assert.Null(await NotaAtual());
    }

    [Fact]
    public async Task Remover_SemNota()
    {
        var resultado = await _servico.RemoverAsync(BancoEmMemoria.IdUsuario, BancoEmMemoria.IdLivro, CancellationToken.None);

        Assert.Equal(ResultadoAvaliacao.NaoEncontrada, resultado);
    }
}
