namespace Livros.Dominio.Entidades;

public class Usuario
{
    public long IdUsuario { get; set; }
    public string Nome { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string SenhaHash { get; set; } = null!;
    public DateTimeOffset DataCadastro { get; set; }

    public ICollection<LivroSalvo> LivrosSalvos { get; set; } = [];
    public ICollection<Interacao> Interacoes { get; set; } = [];
}
