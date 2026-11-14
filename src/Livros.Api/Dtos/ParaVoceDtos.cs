namespace Livros.Api.Dtos;

// nota nula = o livro so esta salvo na biblioteca
public record MotivoDto(long IdLivro, string Titulo, int? Nota);

// origem por item: "avaliacoes" (vizinhos dos seus livros) ou "categoria" (complemento)
public record SugestaoParaVoceDto(LivroResumoDto Livro, double Pontuacao, int Posicao, string Origem, IReadOnlyList<MotivoDto> Motivos);

public record ParaVoceDto(string Origem, int TotalAvaliacoes, int TotalSalvos, IReadOnlyList<SugestaoParaVoceDto> Recomendacoes);
