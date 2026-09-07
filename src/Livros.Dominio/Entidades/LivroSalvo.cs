namespace Livros.Dominio.Entidades;

public class LivroSalvo
{
    public long IdSalvo { get; set; }
    public long IdUsuario { get; set; }
    public long IdLivro { get; set; }
    public DateTimeOffset DataSalvo { get; set; }

    public Usuario Usuario { get; set; } = null!;
    public Livro Livro { get; set; } = null!;
}
