namespace Livros.Api.Dtos;

public record AvaliacaoDto(int? Nota);

// a faixa de 1 a 5 e conferida no AvaliacoesService; nota ausente chega como 0 e vira 400
public record AvaliarDto(int Nota);
