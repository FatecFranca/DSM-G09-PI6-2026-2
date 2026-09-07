using Livros.Dominio.Entidades;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Livros.Dados.Configuracoes;

public class LivroSalvoConfiguracao : IEntityTypeConfiguration<LivroSalvo>
{
    public void Configure(EntityTypeBuilder<LivroSalvo> entidade)
    {
        entidade.ToTable("livros_salvos", tabela => tabela.ExcludeFromMigrations());

        entidade.HasKey(salvo => salvo.IdSalvo);
        entidade.Property(salvo => salvo.IdSalvo).UseIdentityAlwaysColumn();

        entidade.Property(salvo => salvo.DataSalvo)
            .HasDefaultValueSql("CURRENT_TIMESTAMP")
            .ValueGeneratedOnAdd();

        entidade.HasIndex(salvo => new { salvo.IdUsuario, salvo.IdLivro })
            .IsUnique()
            .HasDatabaseName("uq_usuario_livro_salvo");

        entidade.HasOne(salvo => salvo.Usuario)
            .WithMany(usuario => usuario.LivrosSalvos)
            .HasForeignKey(salvo => salvo.IdUsuario)
            .HasConstraintName("fk_salvo_usuario")
            .OnDelete(DeleteBehavior.Cascade);

        entidade.HasOne(salvo => salvo.Livro)
            .WithMany(livro => livro.LivrosSalvos)
            .HasForeignKey(salvo => salvo.IdLivro)
            .HasConstraintName("fk_salvo_livro")
            .OnDelete(DeleteBehavior.Cascade);
    }
}
