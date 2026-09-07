using Livros.Api.Dtos;
using Livros.Dados;
using Livros.Dominio.Entidades;

namespace Livros.Api;

public static class Mapeamentos
{
    public static LivroResumoDto ParaResumo(this Livro livro) => new(
        livro.IdLivro,
        livro.Titulo,
        livro.Autores,
        livro.Categoria,
        livro.AnoPublicacao,
        livro.MesPublicacao,
        livro.ImagemCapa,
        livro.PrecoInicial);

    public static LivroDetalheDto ParaDetalhe(this Livro livro) => new(
        livro.IdLivro,
        livro.Titulo,
        livro.Autores,
        livro.Categoria,
        livro.AnoPublicacao,
        livro.MesPublicacao,
        livro.ImagemCapa,
        livro.PrecoInicial,
        livro.Isbn,
        livro.Descricao,
        livro.Editora,
        livro.AvaliacaoMedia);

    public static CategoriaDto ParaDto(this CategoriaResultado resultado) =>
        new(resultado.Categoria, resultado.TotalLivros);

    // senha_hash nunca sai da api
    public static UsuarioDto ParaDto(this Usuario usuario) =>
        new(usuario.IdUsuario, usuario.Nome, usuario.Email, usuario.DataCadastro);
}
