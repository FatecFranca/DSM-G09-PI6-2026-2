using Livros.Dominio.Entidades;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Livros.Dados.Configuracoes;

public class InteracaoConfiguracao : IEntityTypeConfiguration<Interacao>
{
    public void Configure(EntityTypeBuilder<Interacao> entidade)
    {
        entidade.ToTable("interacoes", tabela =>
        {
            tabela.ExcludeFromMigrations();
            tabela.HasCheckConstraint(
                "chk_tipo_interacao",
                "tipo_interacao IN ('visualizacao', 'salvou', 'removeu_salvo')");
        });

        entidade.HasKey(interacao => interacao.IdInteracao);
        entidade.Property(interacao => interacao.IdInteracao).UseIdentityAlwaysColumn();

        entidade.Property(interacao => interacao.TipoInteracao).HasMaxLength(50).IsRequired();

        entidade.Property(interacao => interacao.DataInteracao)
            .HasDefaultValueSql("CURRENT_TIMESTAMP")
            .ValueGeneratedOnAdd();

        entidade.HasOne(interacao => interacao.Usuario)
            .WithMany(usuario => usuario.Interacoes)
            .HasForeignKey(interacao => interacao.IdUsuario)
            .HasConstraintName("fk_interacao_usuario")
            .OnDelete(DeleteBehavior.Cascade);

        entidade.HasOne(interacao => interacao.Livro)
            .WithMany(livro => livro.Interacoes)
            .HasForeignKey(interacao => interacao.IdLivro)
            .HasConstraintName("fk_interacao_livro")
            .OnDelete(DeleteBehavior.Cascade);
    }
}
