using Livros.Api.Services;

namespace Livros.Api.Testes.Services;

public class CalculadoraParaVoceTestes
{
    // exemplo usado na explicacao ao grupo
    private static readonly SinalDoUsuario DomCasmurro = new(31, "Dom Casmurro", 5);
    private static readonly SinalDoUsuario OCortico = new(77, "O Cortiço", 4);
    private static readonly SinalDoUsuario Iracema = new(50, "Iracema", null);
    private static readonly SinalDoUsuario Crepusculo = new(90, "Crepúsculo", 1);

    private static readonly SinalDoUsuario[] Todos = [DomCasmurro, OCortico, Iracema, Crepusculo];

    [Fact]
    public void Peso_ConverteNotaESalvo()
    {
        Assert.Equal(2, CalculadoraParaVoce.Peso(5));
        Assert.Equal(0, CalculadoraParaVoce.Peso(3));
        Assert.Equal(-2, CalculadoraParaVoce.Peso(1));
        Assert.Equal(1, CalculadoraParaVoce.Peso(null));
    }

    [Fact]
    public void Calcular_SomaPesoVezesScore_EOrdenaMotivosPelaContribuicao()
    {
        var sugestoes = CalculadoraParaVoce.Calcular(Todos, [new(31, 812, 0.62), new(77, 812, 0.40)], 20);

        var sugestao = Assert.Single(sugestoes);
        Assert.Equal(812, sugestao.IdLivro);
        Assert.Equal(1.64, sugestao.Pontuacao, 9);
        Assert.Equal([31L, 77L], sugestao.Motivos.Select(motivo => motivo.IdLivro));
        Assert.Equal("Dom Casmurro", sugestao.Motivos[0].Titulo);
        Assert.Equal(5, sugestao.Motivos[0].Nota);
    }

    [Fact]
    public void Calcular_NotaBaixaAfastaVizinho()
    {
        var sugestoes = CalculadoraParaVoce.Calcular(Todos, [new(90, 700, 0.80), new(50, 700, 0.30)], 20);

        Assert.Empty(sugestoes);
    }

    [Fact]
    public void Calcular_ExcluiLivrosDoUsuario()
    {
        var sugestoes = CalculadoraParaVoce.Calcular(Todos, [new(31, 77, 0.9), new(31, 812, 0.5)], 20);

        Assert.Equal([812L], sugestoes.Select(sugestao => sugestao.IdLivro));
    }

    [Fact]
    public void Calcular_NotaTresNaoContaNemViraMotivo()
    {
        SinalDoUsuario[] sinais = [new(60, "Neutro", 3), DomCasmurro];

        var sugestao = Assert.Single(CalculadoraParaVoce.Calcular(sinais, [new(60, 400, 0.9), new(31, 400, 0.1)], 20));

        Assert.Equal(0.2, sugestao.Pontuacao, 9);
        Assert.Equal([31L], sugestao.Motivos.Select(motivo => motivo.IdLivro));
    }

    [Fact]
    public void Calcular_LimitaMotivosADoisPositivos()
    {
        var sugestao = Assert.Single(CalculadoraParaVoce.Calcular(
            Todos,
            [new(31, 812, 0.5), new(77, 812, 0.5), new(50, 812, 0.6), new(90, 812, 0.1)],
            20));

        Assert.Equal([31L, 50L], sugestao.Motivos.Select(motivo => motivo.IdLivro));
    }

    [Fact]
    public void Calcular_OrdenaPorPontuacaoDesempataPorIdERespeitaTotal()
    {
        var sugestoes = CalculadoraParaVoce.Calcular(
            [OCortico],
            [new(77, 300, 0.5), new(77, 200, 0.5), new(77, 400, 0.9)],
            2);

        Assert.Equal([400L, 200L], sugestoes.Select(sugestao => sugestao.IdLivro));
    }

    [Fact]
    public void Calcular_SemSinalPositivo_RetornaVazio()
    {
        Assert.Empty(CalculadoraParaVoce.Calcular([Crepusculo], [new(90, 812, 0.9)], 20));
    }

    [Fact]
    public void Calcular_SomaQueSeAnula_NaoAparece()
    {
        SinalDoUsuario[] sinais = [new(1, "A", null), new(2, "B", 4), new(3, "C", 2)];

        // 0.1 + 0.2 - 0.3 da zero, mas em ponto flutuante sobra um residuo positivo
        var sugestoes = CalculadoraParaVoce.Calcular(sinais, [new(1, 9, 0.1), new(2, 9, 0.2), new(3, 9, 0.3)], 20);

        Assert.Empty(sugestoes);
    }

    [Theory]
    [InlineData("Pride and Prejudice (Penguin Classics)", "pride and prejudice")]
    [InlineData("Pride & Prejudice", "pride and prejudice")]
    [InlineData("  PRIDE AND PREJUDICE [Illustrated] ", "pride and prejudice")]
    [InlineData("Pride and Prejudice and Zombies", "pride and prejudice and zombies")]
    [InlineData("Dracula: The Un-Dead", "dracula the un dead")]
    public void TituloBase_IgnoraEdicaoCaixaEPontuacao(string titulo, string esperado)
    {
        Assert.Equal(esperado, CalculadoraParaVoce.TituloBase(titulo));
    }

    [Fact]
    public void SemEdicoesRepetidas_TiraEdicoesDosLivrosDoUsuarioEDuplicatas()
    {
        (long, string)[] candidatos =
        [
            (1, "Pride and Prejudice (The World's Classics)"),
            (2, "Emma (Wordsworth Classics)"),
            (3, "Pride & Prejudice"),
            (4, "Emma (Penguin Classics)"),
            (5, "Mansfield Park"),
        ];

        var ids = CalculadoraParaVoce.SemEdicoesRepetidas(candidatos, ["Pride and Prejudice (Penguin Classics)"], total: 20);

        Assert.Equal([2L, 5L], ids);
    }

    [Fact]
    public void SemEdicoesRepetidas_RespeitaTotalDepoisDeFiltrar()
    {
        (long, string)[] candidatos = [(1, "A (1)"), (2, "A (2)"), (3, "B"), (4, "C")];

        Assert.Equal([1L, 3L], CalculadoraParaVoce.SemEdicoesRepetidas(candidatos, [], total: 2));
    }
}
