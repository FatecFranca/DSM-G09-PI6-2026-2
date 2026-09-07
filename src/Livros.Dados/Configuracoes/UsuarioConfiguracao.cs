using Livros.Dominio.Entidades;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Livros.Dados.Configuracoes;

public class UsuarioConfiguracao : IEntityTypeConfiguration<Usuario>
{
    public void Configure(EntityTypeBuilder<Usuario> entidade)
    {
        entidade.ToTable("usuarios", tabela => tabela.ExcludeFromMigrations());

        entidade.HasKey(usuario => usuario.IdUsuario);
        entidade.Property(usuario => usuario.IdUsuario).UseIdentityAlwaysColumn();

        entidade.Property(usuario => usuario.Nome).HasMaxLength(150).IsRequired();
        entidade.Property(usuario => usuario.Email).HasMaxLength(255).IsRequired();
        entidade.Property(usuario => usuario.SenhaHash).HasMaxLength(255).IsRequired();

        entidade.Property(usuario => usuario.DataCadastro)
            .HasDefaultValueSql("CURRENT_TIMESTAMP")
            .ValueGeneratedOnAdd();

        entidade.HasIndex(usuario => usuario.Email)
            .IsUnique()
            .HasDatabaseName("usuarios_email_key");
    }
}
