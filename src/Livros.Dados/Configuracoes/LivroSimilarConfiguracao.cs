using Livros.Dominio.Entidades;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Livros.Dados.Configuracoes;

public class LivroSimilarConfiguracao : IEntityTypeConfiguration<LivroSimilar>
{
    public void Configure(EntityTypeBuilder<LivroSimilar> entidade)
    {
        // unica tabela gerenciada pelas migrations da api
        entidade.ToTable("livros_similares");

        entidade.HasKey(similar => new { similar.IdLivro, similar.Posicao });

        entidade.Property(similar => similar.Score).IsRequired();

        entidade.HasOne(similar => similar.Livro)
            .WithMany(livro => livro.Similares)
            .HasForeignKey(similar => similar.IdLivro)
            .HasConstraintName("fk_similar_livro")
            .OnDelete(DeleteBehavior.Cascade);

        entidade.HasOne(similar => similar.Similar)
            .WithMany()
            .HasForeignKey(similar => similar.IdLivroSimilar)
            .HasConstraintName("fk_similar_livro_alvo")
            .OnDelete(DeleteBehavior.Cascade);
    }
}
