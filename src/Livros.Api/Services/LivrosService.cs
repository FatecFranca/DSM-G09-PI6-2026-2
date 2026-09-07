using Livros.Dados;
using Livros.Dominio.Entidades;
using Microsoft.EntityFrameworkCore;

namespace Livros.Api.Services;

public class LivrosService(ContextoLivros contexto)
{
    public async Task<(IReadOnlyList<Livro> Itens, int Total)> GetLivrosAsync(
        int pagina,
        int tamanhoPagina,
        string? categoria,
        string? busca,
        CancellationToken cancelamento)
    {
        var consulta = AplicarFiltros(contexto.Livros.AsNoTracking(), categoria, busca);

        var total = await consulta.CountAsync(cancelamento);
        if (total == 0)
        {
            return ([], 0);
        }

        var itens = await consulta
            .OrderBy(livro => livro.Titulo)
            .ThenBy(livro => livro.IdLivro)
            .Skip((pagina - 1) * tamanhoPagina)
            .Take(tamanhoPagina)
            .ToListAsync(cancelamento);

        return (itens, total);
    }

    public Task<Livro?> GetLivroPorIdAsync(long idLivro, CancellationToken cancelamento) =>
        contexto.Livros.AsNoTracking().FirstOrDefaultAsync(livro => livro.IdLivro == idLivro, cancelamento);

    public async Task<Dictionary<long, Livro>> GetLivrosPorIdsAsync(
        IReadOnlyCollection<long> ids,
        CancellationToken cancelamento)
    {
        if (ids.Count == 0)
        {
            return [];
        }

        return await contexto.Livros
            .AsNoTracking()
            .Where(livro => ids.Contains(livro.IdLivro))
            .ToDictionaryAsync(livro => livro.IdLivro, cancelamento);
    }

    private static IQueryable<Livro> AplicarFiltros(IQueryable<Livro> consulta, string? categoria, string? busca)
    {
        if (!string.IsNullOrWhiteSpace(categoria))
        {
            var padrao = Filtros.MontarPadraoDeBusca(categoria);
            consulta = consulta.Where(livro => EF.Functions.ILike(livro.Categoria!, padrao));
        }

        if (!string.IsNullOrWhiteSpace(busca))
        {
            var padrao = Filtros.MontarPadraoDeBusca(busca);
            consulta = consulta.Where(livro =>
                EF.Functions.ILike(livro.Titulo, padrao) || EF.Functions.ILike(livro.Autores!, padrao));
        }

        return consulta;
    }

}
