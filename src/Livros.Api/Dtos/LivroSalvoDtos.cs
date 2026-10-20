namespace Livros.Api.Dtos;

public record LivroSalvoDto(long IdSalvo, DateTimeOffset DataSalvo, LivroResumoDto Livro);
