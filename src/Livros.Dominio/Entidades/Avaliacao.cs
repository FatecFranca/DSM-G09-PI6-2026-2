namespace Livros.Dominio.Entidades;

// nota de 1 a 5 estrelas; tabela criada por database/05_avaliacoes.sql
public class Avaliacao
{
    public long IdAvaliacao { get; set; }
    public long IdUsuario { get; set; }
    public long IdLivro { get; set; }
    public short Nota { get; set; }
    public DateTimeOffset AvaliadoEm { get; set; }

    public Usuario Usuario { get; set; } = null!;
    public Livro Livro { get; set; } = null!;
}
