using Livros.Dados;
using Microsoft.EntityFrameworkCore;

namespace Livros.Api.Services;

public class CategoriasService(ContextoLivros contexto)
{
    // a coluna categoria guarda varios rotulos separados por virgula;
    // o unnest quebra em categorias atomicas para o filtro do front
    public Task<List<CategoriaResultado>> GetCategoriasAsync(
        int minimoDeLivros,
        int limite,
        CancellationToken cancelamento) =>
        contexto.CategoriasApuradas
            .FromSql(
                $"""
                 SELECT btrim(rotulo) AS categoria, COUNT(*)::int AS total_livros
                 FROM livros, LATERAL unnest(string_to_array(categoria, ',')) AS rotulo
                 WHERE categoria IS NOT NULL AND btrim(rotulo) <> ''
                 GROUP BY btrim(rotulo)
                 HAVING COUNT(*) >= {minimoDeLivros}
                 ORDER BY total_livros DESC, categoria
                 LIMIT {limite}
                 """)
            .AsNoTracking()
            .ToListAsync(cancelamento);
}
