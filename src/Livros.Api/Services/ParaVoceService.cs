using Livros.Api.Dtos;
using Livros.Dados;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Livros.Api.Services;

public static class OrigemParaVoce
{
    public const string Avaliacoes = "avaliacoes";
    public const string Categoria = "categoria";
    public const string SemDados = "sem_dados";
}

// recomendacao individual: notas e salvos do usuario + vizinhos ja gravados pelo ml
public class ParaVoceService(ContextoLivros contexto)
{
    // busca alguns livros a mais por categoria porque as edicoes repetidas sao descartadas depois
    private const int FolgaParaEdicoes = 3;

    public async Task<ParaVoceDto> GerarAsync(long idUsuario, int total, CancellationToken ct)
    {
        var notas = await LerNotasAsync(idUsuario, ct);
        var salvos = await contexto.LivrosSalvos.AsNoTracking()
            .Where(salvo => salvo.IdUsuario == idUsuario)
            .Select(salvo => new SinalDoUsuario(salvo.IdLivro, salvo.Livro.Titulo, null))
            .ToListAsync(ct);

        // quando o livro salvo tambem tem nota, vale a nota
        var avaliados = notas.Select(nota => nota.IdLivro).ToHashSet();
        var sinais = notas.Concat(salvos.Where(salvo => !avaliados.Contains(salvo.IdLivro))).ToList();

        var positivos = sinais.Where(sinal => CalculadoraParaVoce.Peso(sinal.Nota) > 0).ToList();
        if (positivos.Count == 0) return Montar(OrigemParaVoce.SemDados, notas.Count, salvos.Count, []);

        var vizinhos = await LerVizinhosAsync(sinais, ct);
        // calcula todos os candidatos: o corte em "total" so vem depois de tirar as edicoes repetidas
        var calculadas = CalculadoraParaVoce.Calcular(sinais, vizinhos, int.MaxValue);
        var sugestoes = await ParaDtoAsync(calculadas, sinais, total, ct);

        // lista curta (poucos vizinhos ou modelo nao treinado): completa com a categoria do livro de maior peso
        var referencia = positivos
            .OrderByDescending(sinal => CalculadoraParaVoce.Peso(sinal.Nota))
            .ThenBy(sinal => sinal.IdLivro)
            .First();
        var complemento = sugestoes.Count < total
            ? await BuscarPorCategoriaAsync(referencia, sinais, sugestoes, total - sugestoes.Count, ct)
            : [];

        var lista = sugestoes.Concat(complemento).ToList();
        if (lista.Count == 0) return Montar(OrigemParaVoce.SemDados, notas.Count, salvos.Count, []);
        var origem = sugestoes.Count > 0 ? OrigemParaVoce.Avaliacoes : OrigemParaVoce.Categoria;
        return Montar(origem, notas.Count, salvos.Count, lista);
    }

    private static ParaVoceDto Montar(string origem, int totalAvaliacoes, int totalSalvos, IReadOnlyList<SugestaoParaVoceDto> sugestoes) =>
        new(origem, totalAvaliacoes, totalSalvos, sugestoes);

    private async Task<List<SinalDoUsuario>> LerNotasAsync(long idUsuario, CancellationToken ct)
    {
        try
        {
            return await contexto.Avaliacoes.AsNoTracking()
                .Where(avaliacao => avaliacao.IdUsuario == idUsuario)
                .Select(avaliacao => new SinalDoUsuario(avaliacao.IdLivro, avaliacao.Livro.Titulo, avaliacao.Nota))
                .ToListAsync(ct);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UndefinedTable)
        {
            // banco sem o 05_avaliacoes.sql: segue so com os salvos
            return [];
        }
    }

    private async Task<List<Vizinho>> LerVizinhosAsync(List<SinalDoUsuario> sinais, CancellationToken ct)
    {
        var ids = sinais.Where(sinal => CalculadoraParaVoce.Peso(sinal.Nota) != 0).Select(sinal => sinal.IdLivro).ToList();
        try
        {
            return await contexto.LivrosSimilares.AsNoTracking()
                .Where(similar => ids.Contains(similar.IdLivro))
                .Select(similar => new Vizinho(similar.IdLivro, similar.IdLivroSimilar, similar.Score))
                .ToListAsync(ct);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UndefinedTable)
        {
            return [];
        }
    }

    private async Task<IReadOnlyList<SugestaoParaVoceDto>> ParaDtoAsync(
        IReadOnlyList<SugestaoCalculada> calculadas,
        List<SinalDoUsuario> sinais,
        int total,
        CancellationToken ct)
    {
        var ids = calculadas.Select(sugestao => sugestao.IdLivro).ToList();
        var livros = await contexto.Livros.AsNoTracking()
            .Where(livro => ids.Contains(livro.IdLivro))
            .ToDictionaryAsync(livro => livro.IdLivro, ct);

        var candidatos = calculadas
            .Where(sugestao => livros.ContainsKey(sugestao.IdLivro))
            .Select(sugestao => (sugestao.IdLivro, livros[sugestao.IdLivro].Titulo));
        var escolhidos = CalculadoraParaVoce.SemEdicoesRepetidas(candidatos, sinais.Select(sinal => sinal.Titulo), total);

        var porId = calculadas.ToDictionary(sugestao => sugestao.IdLivro);
        return escolhidos.Select((id, indice) =>
        {
            var calculada = porId[id];
            var motivos = calculada.Motivos.Select(motivo => new MotivoDto(motivo.IdLivro, motivo.Titulo, motivo.Nota)).ToList();
            return new SugestaoParaVoceDto(
                livros[id].ParaResumo(), Math.Round(calculada.Pontuacao, 6), indice + 1, OrigemParaVoce.Avaliacoes, motivos);
        }).ToList();
    }

    private async Task<IReadOnlyList<SugestaoParaVoceDto>> BuscarPorCategoriaAsync(
        SinalDoUsuario referencia,
        List<SinalDoUsuario> sinais,
        IReadOnlyList<SugestaoParaVoceDto> jaEscolhidas,
        int quantidade,
        CancellationToken ct)
    {
        var categoria = (await contexto.Livros.AsNoTracking()
            .Where(livro => livro.IdLivro == referencia.IdLivro)
            .Select(livro => livro.Categoria)
            .FirstOrDefaultAsync(ct))?.Trim().ToLower();
        var principal = categoria?.Split(',')[0].Trim();
        if (string.IsNullOrEmpty(categoria) || string.IsNullOrEmpty(principal)) return [];

        // fora: livros do usuario, o que ja foi sugerido e outras edicoes dessas obras
        var excluidos = sinais.Select(sinal => sinal.IdLivro)
            .Concat(jaEscolhidas.Select(sugestao => sugestao.Livro.IdLivro))
            .ToList();
        var titulosVistos = sinais.Select(sinal => sinal.Titulo)
            .Concat(jaEscolhidas.Select(sugestao => sugestao.Livro.Titulo));

        // primeiro a categoria completa igual ("fiction, classics"), depois as que comecam pela principal
        // ("fiction, ..."); comecar por ela evita pegar "juvenile nonfiction"
        var limite = quantidade * FolgaParaEdicoes;
        var livros = await contexto.Livros.AsNoTracking()
            .Where(livro => livro.Categoria != null
                && livro.Categoria.ToLower() == categoria
                && !excluidos.Contains(livro.IdLivro))
            .OrderBy(livro => livro.IdLivro)
            .Take(limite)
            .ToListAsync(ct);
        if (livros.Count < limite)
        {
            livros.AddRange(await contexto.Livros.AsNoTracking()
                .Where(livro => livro.Categoria != null
                    && livro.Categoria.ToLower().StartsWith(principal)
                    && livro.Categoria.ToLower() != categoria
                    && !excluidos.Contains(livro.IdLivro))
                .OrderBy(livro => livro.IdLivro)
                .Take(limite - livros.Count)
                .ToListAsync(ct));
        }

        var porId = livros.ToDictionary(livro => livro.IdLivro);
        var escolhidos = CalculadoraParaVoce.SemEdicoesRepetidas(
            livros.Select(livro => (livro.IdLivro, livro.Titulo)), titulosVistos, quantidade);
        var motivo = new MotivoDto(referencia.IdLivro, referencia.Titulo, referencia.Nota);
        return escolhidos
            .Select((id, indice) => new SugestaoParaVoceDto(
                porId[id].ParaResumo(), 0, jaEscolhidas.Count + indice + 1, OrigemParaVoce.Categoria, [motivo]))
            .ToList();
    }
}
