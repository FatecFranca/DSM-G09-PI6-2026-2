using Livros.Dominio.Entidades;
using Microsoft.EntityFrameworkCore;

namespace Livros.Dados;

public class ContextoLivros(DbContextOptions<ContextoLivros> opcoes) : DbContext(opcoes)
{
    public DbSet<Livro> Livros => Set<Livro>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<LivroSalvo> LivrosSalvos => Set<LivroSalvo>();
    public DbSet<Interacao> Interacoes => Set<Interacao>();
    public DbSet<LivroSimilar> LivrosSimilares => Set<LivroSimilar>();
    public DbSet<CategoriaResultado> CategoriasApuradas => Set<CategoriaResultado>();

    protected override void OnModelCreating(ModelBuilder construtor)
    {
        construtor.ApplyConfigurationsFromAssembly(typeof(ContextoLivros).Assembly);
        construtor.Entity<CategoriaResultado>().HasNoKey().ToView(null);
    }
}
