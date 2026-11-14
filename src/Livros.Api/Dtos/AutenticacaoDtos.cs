using System.ComponentModel.DataAnnotations;

namespace Livros.Api.Dtos;

public record EntrarDto(
    [Required, EmailAddress, StringLength(255)] string Email,
    [Required, StringLength(100)] string Senha);
