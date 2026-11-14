namespace Livros.Api.Mensageria;

// tipo usa os valores de Livros.Dominio.Entidades.TiposDeInteracao (mesmo CHECK da tabela interacoes)
public record EventoInteracao(Guid IdEvento, string Tipo, long IdUsuario, long IdLivro, DateTimeOffset Data)
{
    public static EventoInteracao Criar(string tipo, long idUsuario, long idLivro) =>
        new(Guid.NewGuid(), tipo, idUsuario, idLivro, DateTimeOffset.UtcNow);
}
