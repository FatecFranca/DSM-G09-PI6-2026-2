namespace Livros.Dominio.Entidades;

public class Livro
{
    public long IdLivro { get; set; }
    public string Titulo { get; set; } = null!;
    public string? Isbn { get; set; }
    public string? Descricao { get; set; }
    public int? AnoPublicacao { get; set; }
    public string? ImagemCapa { get; set; }
    public string? Autores { get; set; }
    public string? Categoria { get; set; }
    public decimal? AvaliacaoMedia { get; set; }
    public string? Editora { get; set; }
    public decimal? PrecoInicial { get; set; }
    public string? MesPublicacao { get; set; }

    public ICollection<LivroSalvo> LivrosSalvos { get; set; } = [];
    public ICollection<Interacao> Interacoes { get; set; } = [];
    public ICollection<LivroSimilar> Similares { get; set; } = [];
}
