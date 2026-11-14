using System.Text;
using System.Text.RegularExpressions;

namespace Livros.Api.Services;

// livro avaliado ou salvo pelo usuario; nota nula = so salvo
public record SinalDoUsuario(long IdLivro, string Titulo, int? Nota);

// uma linha de livros_similares
public record Vizinho(long IdLivro, long IdLivroSimilar, double Score);

public record MotivoCalculado(long IdLivro, string Titulo, int? Nota);

public record SugestaoCalculada(long IdLivro, double Pontuacao, IReadOnlyList<MotivoCalculado> Motivos);

// knn baseado em itens: cada livro do usuario empurra seus vizinhos com peso x similaridade
public static class CalculadoraParaVoce
{
    private const int MaximoDeMotivos = 2;

    // abaixo disso a soma e residuo de ponto flutuante (ex.: 0.1 + 0.2 - 0.3)
    private const double PontuacaoMinima = 1e-9;

    // nota 5 aproxima (+2), nota 1 afasta (-2), so salvo conta como nota 4
    public static int Peso(int? nota) => nota is null ? 1 : nota.Value - 3;

    public static IReadOnlyList<SugestaoCalculada> Calcular(
        IReadOnlyList<SinalDoUsuario> sinais,
        IReadOnlyList<Vizinho> vizinhos,
        int total)
    {
        var sinaisPorLivro = sinais.ToDictionary(sinal => sinal.IdLivro);
        var somas = new Dictionary<long, double>();
        var contribuicoes = new Dictionary<long, List<(SinalDoUsuario Sinal, double Valor)>>();

        foreach (var vizinho in vizinhos)
        {
            if (!sinaisPorLivro.TryGetValue(vizinho.IdLivro, out var sinal)) continue;
            if (sinaisPorLivro.ContainsKey(vizinho.IdLivroSimilar)) continue;

            var peso = Peso(sinal.Nota);
            if (peso == 0) continue;

            var valor = peso * vizinho.Score;
            somas[vizinho.IdLivroSimilar] = somas.GetValueOrDefault(vizinho.IdLivroSimilar) + valor;

            if (valor > 0)
            {
                if (!contribuicoes.TryGetValue(vizinho.IdLivroSimilar, out var lista))
                {
                    lista = [];
                    contribuicoes[vizinho.IdLivroSimilar] = lista;
                }
                lista.Add((sinal, valor));
            }
        }

        return somas
            .Where(soma => soma.Value > PontuacaoMinima)
            .OrderByDescending(soma => soma.Value)
            .ThenBy(soma => soma.Key)
            .Take(total)
            .Select(soma => new SugestaoCalculada(soma.Key, soma.Value, Motivos(contribuicoes[soma.Key])))
            .ToList();
    }

    // o dataset nao junta edicoes da mesma obra: "Pride and Prejudice (Penguin Classics)" e
    // "Pride & Prejudice" sao livros diferentes. o titulo-base tira edicao, caixa e pontuacao.
    public static string TituloBase(string titulo)
    {
        var semEdicao = Regex.Replace(titulo.ToLowerInvariant(), @"\([^)]*\)|\[[^\]]*\]", " ").Replace("&", " and ");
        var texto = new StringBuilder(semEdicao.Length);
        foreach (var caractere in semEdicao)
            texto.Append(char.IsLetterOrDigit(caractere) ? caractere : ' ');
        return string.Join(' ', texto.ToString().Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }

    // mantem a ordem; tira outras edicoes dos livros do usuario e repete cada obra uma vez so
    public static IReadOnlyList<long> SemEdicoesRepetidas(
        IEnumerable<(long IdLivro, string Titulo)> candidatos,
        IEnumerable<string> titulosDoUsuario,
        int total)
    {
        var vistos = titulosDoUsuario.Select(TituloBase).ToHashSet();
        var ids = new List<long>();
        foreach (var (idLivro, titulo) in candidatos)
        {
            if (ids.Count == total) break;
            if (vistos.Add(TituloBase(titulo))) ids.Add(idLivro);
        }
        return ids;
    }

    private static IReadOnlyList<MotivoCalculado> Motivos(List<(SinalDoUsuario Sinal, double Valor)> contribuicoes) =>
        contribuicoes
            .OrderByDescending(item => item.Valor)
            .ThenBy(item => item.Sinal.IdLivro)
            .Take(MaximoDeMotivos)
            .Select(item => new MotivoCalculado(item.Sinal.IdLivro, item.Sinal.Titulo, item.Sinal.Nota))
            .ToList();
}
