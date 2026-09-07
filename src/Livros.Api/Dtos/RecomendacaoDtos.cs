namespace Livros.Api.Dtos;

public record RecomendacaoDto(LivroResumoDto Livro, double Score, int Posicao);

public record RecomendacoesDto(long IdLivro, string Origem, IReadOnlyList<RecomendacaoDto> Recomendacoes);
