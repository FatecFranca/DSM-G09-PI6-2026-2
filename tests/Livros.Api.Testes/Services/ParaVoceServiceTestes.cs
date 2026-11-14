using Livros.Api.Services;
using Livros.Api.Testes.Fakes;
using Livros.Dados;
using Livros.Dominio.Entidades;

namespace Livros.Api.Testes.Services;

public class ParaVoceServiceTestes
{
    private const long Usuario = BancoEmMemoria.IdUsuario;

    private readonly ContextoLivros _contexto = BancoEmMemoria.Criar();
    private readonly ParaVoceService _servico;

    public ParaVoceServiceTestes()
    {
        _contexto.Livros.AddRange(
            new Livro { IdLivro = 31, Titulo = "Dom Casmurro", Categoria = "Romance" },
            new Livro { IdLivro = 77, Titulo = "O Cortiço", Categoria = "Romance" },
            new Livro { IdLivro = 50, Titulo = "Iracema", Categoria = "Romance" },
            new Livro { IdLivro = 90, Titulo = "Crepúsculo", Categoria = "Fantasia" },
            new Livro { IdLivro = 812, Titulo = "Quincas Borba", Categoria = "Romance" },
            new Livro { IdLivro = 700, Titulo = "Lua Nova", Categoria = "Fantasia" },
            new Livro { IdLivro = 400, Titulo = "Senhora", Categoria = "Romance, Clássicos" });
        _contexto.SaveChanges();
        _servico = new ParaVoceService(_contexto);
    }

    private void Avaliar(long idLivro, short nota) =>
        _contexto.Avaliacoes.Add(new Avaliacao { IdUsuario = Usuario, IdLivro = idLivro, Nota = nota });

    private void Salvar(long idLivro) =>
        _contexto.LivrosSalvos.Add(new LivroSalvo { IdUsuario = Usuario, IdLivro = idLivro });

    private void Vizinho(long idLivro, short posicao, long idSimilar, double score) =>
        _contexto.LivrosSimilares.Add(new LivroSimilar { IdLivro = idLivro, Posicao = posicao, IdLivroSimilar = idSimilar, Score = score });

    private async Task<Livros.Api.Dtos.ParaVoceDto> Gerar(int total = 20)
    {
        await _contexto.SaveChangesAsync();
        _contexto.ChangeTracker.Clear();
        return await _servico.GerarAsync(Usuario, total, CancellationToken.None);
    }

    [Fact]
    public async Task Gerar_ComNotas_UsaVizinhosEMotivosComTitulo()
    {
        Avaliar(31, 5);
        Avaliar(77, 4);
        Vizinho(31, 1, 812, 0.62);
        Vizinho(77, 1, 812, 0.40);

        var resultado = await Gerar();

        Assert.Equal(OrigemParaVoce.Avaliacoes, resultado.Origem);
        var primeira = resultado.Recomendacoes[0];
        Assert.Equal(812, primeira.Livro.IdLivro);
        Assert.Equal("Quincas Borba", primeira.Livro.Titulo);
        Assert.Equal(1.64, primeira.Pontuacao);
        Assert.Equal(1, primeira.Posicao);
        Assert.Equal(
            [("Dom Casmurro", (int?)5), ("O Cortiço", 4)],
            primeira.Motivos.Select(motivo => (motivo.Titulo, motivo.Nota)));
    }

    [Fact]
    public async Task Gerar_SalvoSemNota_ContaComoMaisUm()
    {
        Salvar(50);
        Vizinho(50, 1, 400, 0.55);

        var resultado = await Gerar();

        var sugestao = resultado.Recomendacoes[0];
        Assert.Equal(400, sugestao.Livro.IdLivro);
        Assert.Equal(OrigemParaVoce.Avaliacoes, sugestao.Origem);
        Assert.Equal(0.55, sugestao.Pontuacao);
        var motivo = Assert.Single(sugestao.Motivos);
        Assert.Equal(("Iracema", (int?)null), (motivo.Titulo, motivo.Nota));
        Assert.Equal(1, resultado.TotalSalvos);
        Assert.Equal(0, resultado.TotalAvaliacoes);
    }

    [Fact]
    public async Task Gerar_SalvoComNotaBaixa_PrevaleceANota()
    {
        Salvar(50);
        Avaliar(50, 1);
        Vizinho(50, 1, 400, 0.55);

        var resultado = await Gerar();

        Assert.Equal(OrigemParaVoce.SemDados, resultado.Origem);
        Assert.Empty(resultado.Recomendacoes);
        Assert.Equal(1, resultado.TotalSalvos);
        Assert.Equal(1, resultado.TotalAvaliacoes);
    }

    [Fact]
    public async Task Gerar_SemNotasNemSalvos_SemDados()
    {
        var resultado = await Gerar();

        Assert.Equal(OrigemParaVoce.SemDados, resultado.Origem);
        Assert.Empty(resultado.Recomendacoes);
        Assert.Equal(0, resultado.TotalAvaliacoes);
        Assert.Equal(0, resultado.TotalSalvos);
    }

    [Fact]
    public async Task Gerar_SoNotasBaixas_SemDados()
    {
        Avaliar(90, 1);
        Avaliar(31, 3);
        Vizinho(90, 1, 700, 0.8);
        Vizinho(31, 1, 812, 0.6);

        var resultado = await Gerar();

        Assert.Equal(OrigemParaVoce.SemDados, resultado.Origem);
        Assert.Empty(resultado.Recomendacoes);
    }

    [Fact]
    public async Task Gerar_SinalPositivoSemVizinhos_UsaCategoria()
    {
        Avaliar(31, 5);
        Salvar(77);

        var resultado = await Gerar();

        Assert.Equal(OrigemParaVoce.Categoria, resultado.Origem);
        // primeiro a categoria identica ("Romance"), depois as que comecam por ela ("Romance, Clássicos")
        Assert.Equal([50L, 812L, 400L], resultado.Recomendacoes.Select(item => item.Livro.IdLivro));
        Assert.All(resultado.Recomendacoes, item => Assert.Equal(OrigemParaVoce.Categoria, item.Origem));
        Assert.All(resultado.Recomendacoes, item =>
            Assert.Equal(("Dom Casmurro", (int?)5), (Assert.Single(item.Motivos).Titulo, item.Motivos[0].Nota)));
    }

    [Fact]
    public async Task Gerar_TotalLimitaLista()
    {
        Avaliar(31, 5);
        Vizinho(31, 1, 812, 0.6);
        Vizinho(31, 2, 400, 0.5);
        Vizinho(31, 3, 50, 0.4);

        var resultado = await Gerar(total: 2);

        Assert.Equal([812L, 400L], resultado.Recomendacoes.Select(item => item.Livro.IdLivro));
        Assert.Equal([1, 2], resultado.Recomendacoes.Select(item => item.Posicao));
    }

    [Fact]
    public async Task Gerar_NaoSugereOutrasEdicoesNemRepeteTitulo()
    {
        _contexto.Livros.AddRange(
            new Livro { IdLivro = 1001, Titulo = "Pride and Prejudice (Penguin Classics)", Categoria = "Fiction, Classics" },
            new Livro { IdLivro = 1002, Titulo = "Pride and Prejudice (The World's Classics)", Categoria = "Fiction, Classics" },
            new Livro { IdLivro = 1003, Titulo = "Pride & Prejudice", Categoria = "Fiction, Classics" },
            new Livro { IdLivro = 1004, Titulo = "Emma (Wordsworth Classics)", Categoria = "Fiction, Classics" },
            new Livro { IdLivro = 1005, Titulo = "Emma (Penguin Classics)", Categoria = "Fiction, Classics" },
            new Livro { IdLivro = 1006, Titulo = "Mansfield Park", Categoria = "Fiction, Classics" });
        Avaliar(1001, 5);
        Vizinho(1001, 1, 1002, 0.79);
        Vizinho(1001, 2, 1003, 0.56);
        Vizinho(1001, 3, 1004, 0.40);
        Vizinho(1001, 4, 1005, 0.36);
        Vizinho(1001, 5, 1006, 0.35);

        var resultado = await Gerar(total: 2);

        Assert.Equal(OrigemParaVoce.Avaliacoes, resultado.Origem);
        Assert.Equal([1004L, 1006L], resultado.Recomendacoes.Select(item => item.Livro.IdLivro));
        Assert.Equal([1, 2], resultado.Recomendacoes.Select(item => item.Posicao));
    }

    [Fact]
    public async Task Gerar_PorCategoria_TambemTiraEdicoes()
    {
        _contexto.Livros.AddRange(
            new Livro { IdLivro = 2001, Titulo = "Drácula (Edição de bolso)", Categoria = "Terror" },
            new Livro { IdLivro = 2002, Titulo = "Drácula", Categoria = "Terror" },
            new Livro { IdLivro = 2003, Titulo = "Frankenstein", Categoria = "Terror" },
            new Livro { IdLivro = 2004, Titulo = "Frankenstein (Ilustrado)", Categoria = "Terror" });
        Avaliar(2001, 5);

        var resultado = await Gerar();

        Assert.Equal(OrigemParaVoce.Categoria, resultado.Origem);
        Assert.Equal([2003L], resultado.Recomendacoes.Select(item => item.Livro.IdLivro));
    }

    [Fact]
    public async Task Gerar_ListaCurta_CompletaComCategoria()
    {
        Avaliar(31, 5);
        Vizinho(31, 1, 812, 0.6);

        var resultado = await Gerar(total: 3);

        Assert.Equal(OrigemParaVoce.Avaliacoes, resultado.Origem);
        Assert.Equal([812L, 50L, 77L], resultado.Recomendacoes.Select(item => item.Livro.IdLivro));
        Assert.Equal(
            [OrigemParaVoce.Avaliacoes, OrigemParaVoce.Categoria, OrigemParaVoce.Categoria],
            resultado.Recomendacoes.Select(item => item.Origem));
        Assert.Equal([1, 2, 3], resultado.Recomendacoes.Select(item => item.Posicao));
        Assert.Equal("Dom Casmurro", resultado.Recomendacoes[2].Motivos[0].Titulo);
    }

    [Fact]
    public async Task Gerar_Complemento_NaoRepeteObraJaSugerida()
    {
        _contexto.Livros.Add(new Livro { IdLivro = 60, Titulo = "Quincas Borba (Edição comentada)", Categoria = "Romance" });
        Avaliar(31, 5);
        Vizinho(31, 1, 812, 0.6);

        var resultado = await Gerar(total: 4);

        Assert.Equal([812L, 50L, 77L, 400L], resultado.Recomendacoes.Select(item => item.Livro.IdLivro));
    }

    [Fact]
    public async Task Gerar_Complemento_PrefereCategoriaIdenticaENaoPegaPedacoDePalavra()
    {
        _contexto.Livros.AddRange(
            new Livro { IdLivro = 3001, Titulo = "Pride and Prejudice", Categoria = "Fiction, Classics" },
            new Livro { IdLivro = 3002, Titulo = "Manual Escolar", Categoria = "Juvenile Nonfiction, General" },
            new Livro { IdLivro = 3003, Titulo = "Romance Policial", Categoria = "Fiction, General" },
            new Livro { IdLivro = 3004, Titulo = "Jane Eyre", Categoria = "Fiction, Classics" });
        Avaliar(3001, 5);

        var resultado = await Gerar(total: 5);

        Assert.Equal([3004L, 3003L], resultado.Recomendacoes.Select(item => item.Livro.IdLivro));
    }
}
