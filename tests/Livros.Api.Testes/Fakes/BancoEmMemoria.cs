using Livros.Dados;
using Livros.Dominio.Entidades;
using Microsoft.EntityFrameworkCore;

namespace Livros.Api.Testes.Fakes;

// banco isolado por teste, ja com o usuario 1 e o livro 10
public static class BancoEmMemoria
{
    public const long IdUsuario = 1;
    public const long IdLivro = 10;

    public static ContextoLivros Criar()
    {
        var opcoes = new DbContextOptionsBuilder<ContextoLivros>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var contexto = new ContextoLivros(opcoes);
        contexto.Usuarios.Add(new Usuario { IdUsuario = IdUsuario, Nome = "Leitor", Email = "leitor@teste.com", SenhaHash = "x" });
        contexto.Livros.Add(new Livro { IdLivro = IdLivro, Titulo = "Dom Casmurro" });
        contexto.SaveChanges();
        contexto.ChangeTracker.Clear();
        return contexto;
    }
}
