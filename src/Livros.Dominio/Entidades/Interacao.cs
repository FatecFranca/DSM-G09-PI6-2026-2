namespace Livros.Dominio.Entidades;

public class Interacao
{
    public long IdInteracao { get; set; }
    public long IdUsuario { get; set; }
    public long IdLivro { get; set; }
    public string TipoInteracao { get; set; } = null!;
    public DateTimeOffset DataInteracao { get; set; }

    public Usuario Usuario { get; set; } = null!;
    public Livro Livro { get; set; } = null!;
}
