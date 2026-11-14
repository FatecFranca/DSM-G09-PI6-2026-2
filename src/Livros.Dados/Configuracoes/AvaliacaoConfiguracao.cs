using Livros.Dominio.Entidades;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Livros.Dados.Configuracoes;

public class AvaliacaoConfiguracao : IEntityTypeConfiguration<Avaliacao>
{
    public void Configure(EntityTypeBuilder<Avaliacao> entidade)
    {
        entidade.ToTable("avaliacoes", tabela => tabela.ExcludeFromMigrations());

        entidade.HasKey(avaliacao => avaliacao.IdAvaliacao);
        entidade.Property(avaliacao => avaliacao.IdAvaliacao).UseIdentityAlwaysColumn();

        entidade.Property(avaliacao => avaliacao.AvaliadoEm)
            .HasDefaultValueSql("CURRENT_TIMESTAMP")
            .ValueGeneratedOnAdd();

        entidade.HasIndex(avaliacao => new { avaliacao.IdUsuario, avaliacao.IdLivro })
            .IsUnique()
            .HasDatabaseName("uq_usuario_livro_avaliacao");

        entidade.HasOne(avaliacao => avaliacao.Usuario)
            .WithMany(usuario => usuario.Avaliacoes)
            .HasForeignKey(avaliacao => avaliacao.IdUsuario)
            .HasConstraintName("fk_avaliacao_usuario")
            .OnDelete(DeleteBehavior.Cascade);

        entidade.HasOne(avaliacao => avaliacao.Livro)
            .WithMany(livro => livro.Avaliacoes)
            .HasForeignKey(avaliacao => avaliacao.IdLivro)
            .HasConstraintName("fk_avaliacao_livro")
            .OnDelete(DeleteBehavior.Cascade);
    }
}
