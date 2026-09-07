using Livros.Dominio.Entidades;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Livros.Dados.Configuracoes;

public class LivroConfiguracao : IEntityTypeConfiguration<Livro>
{
    public void Configure(EntityTypeBuilder<Livro> entidade)
    {
        // tabela do time de modelagem: mapeada, mas fora das migrations da api
        entidade.ToTable("livros", tabela => tabela.ExcludeFromMigrations());

        entidade.HasKey(livro => livro.IdLivro);
        entidade.Property(livro => livro.IdLivro).UseIdentityAlwaysColumn();

        entidade.Property(livro => livro.Titulo).HasColumnType("text").IsRequired();
        entidade.Property(livro => livro.Isbn).HasMaxLength(30);
        entidade.Property(livro => livro.Descricao).HasColumnType("text");
        entidade.Property(livro => livro.ImagemCapa).HasColumnType("text");
        entidade.Property(livro => livro.Autores).HasColumnType("text");
        entidade.Property(livro => livro.Categoria).HasColumnType("text");
        entidade.Property(livro => livro.Editora).HasColumnType("text");
        entidade.Property(livro => livro.MesPublicacao).HasMaxLength(30);
        entidade.Property(livro => livro.AvaliacaoMedia).HasPrecision(3, 2);
        entidade.Property(livro => livro.PrecoInicial).HasPrecision(10, 2);
    }
}
