namespace Livros.Api.Dtos;

public record LivroResumoDto(
    long IdLivro,
    string Titulo,
    string? Autores,
    string? Categoria,
    int? AnoPublicacao,
    string? MesPublicacao,
    string? ImagemCapa,
    decimal? PrecoInicial);

public record LivroDetalheDto(
    long IdLivro,
    string Titulo,
    string? Autores,
    string? Categoria,
    int? AnoPublicacao,
    string? MesPublicacao,
    string? ImagemCapa,
    decimal? PrecoInicial,
    string? Isbn,
    string? Descricao,
    string? Editora,
    decimal? AvaliacaoMedia);
