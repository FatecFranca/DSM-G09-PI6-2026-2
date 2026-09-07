namespace Livros.Dominio.Entidades;

// preenchida pelo pipeline de ml em python, so leitura pela api
public class LivroSimilar
{
    public long IdLivro { get; set; }
    public short Posicao { get; set; }
    public long IdLivroSimilar { get; set; }
    public double Score { get; set; }

    public Livro Livro { get; set; } = null!;
    public Livro Similar { get; set; } = null!;
}
