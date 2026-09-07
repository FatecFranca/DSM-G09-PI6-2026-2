using Livros.Dados;
using Livros.Dominio.Entidades;
using Microsoft.EntityFrameworkCore;

namespace Livros.Api.Services;

public record LivroSimilaridade(long IdLivro, double Score);

public static class OrigemDaRecomendacao
{
    public const string Tabela = "tabela";
    public const string Categoria = "categoria";
}

public class RecomendacoesService(ContextoLivros contexto)
{
    public async Task<(string Origem, IReadOnlyList<LivroSimilaridade> Similares)> GetRecomendacoesAsync(
        Livro livro,
        int total,
        CancellationToken cancelamento)
    {
        var daTabela = await BuscarNaTabelaAsync(livro.IdLivro, total, cancelamento);
        if (daTabela.Count > 0)
        {
            return (OrigemDaRecomendacao.Tabela, daTabela);
        }

        return (OrigemDaRecomendacao.Categoria, await BuscarPorCategoriaAsync(livro, total, cancelamento));
    }

    // caminho normal: le o top-n que o pipeline de ml ja gravou
    private async Task<IReadOnlyList<LivroSimilaridade>> BuscarNaTabelaAsync(
        long idLivro,
        int total,
        CancellationToken cancelamento) =>
        await contexto.LivrosSimilares
            .AsNoTracking()
            .Where(similar => similar.IdLivro == idLivro)
            .OrderBy(similar => similar.Posicao)
            .Take(total)
            .Select(similar => new LivroSimilaridade(similar.IdLivroSimilar, similar.Score))
            .ToListAsync(cancelamento);

    // plano b quando o modelo ainda nao foi treinado
    private async Task<IReadOnlyList<LivroSimilaridade>> BuscarPorCategoriaAsync(
        Livro livro,
        int total,
        CancellationToken cancelamento)
    {
        if (string.IsNullOrWhiteSpace(livro.Categoria))
        {
            return [];
        }

        var categoriaPrincipal = livro.Categoria.Split(',')[0].Trim();
        if (categoriaPrincipal.Length == 0)
        {
            return [];
        }

        var padrao = Filtros.MontarPadraoDeBusca(categoriaPrincipal);

        return await contexto.Livros
            .AsNoTracking()
            .Where(outro => outro.IdLivro != livro.IdLivro && EF.Functions.ILike(outro.Categoria!, padrao))
            .OrderBy(outro => outro.IdLivro)
            .Take(total)
            .Select(outro => new LivroSimilaridade(outro.IdLivro, 0d))
            .ToListAsync(cancelamento);
    }
}
