using System.ComponentModel.DataAnnotations;

namespace Livros.Api.Dtos;

public record UsuarioDto(long IdUsuario, string Nome, string Email, DateTimeOffset DataCadastro);

// em record posicional a validacao vai no parametro do construtor, nao em [property:]
public record CriarUsuarioDto(
    [Required(ErrorMessage = "o nome e obrigatorio")]
    [StringLength(150, MinimumLength = 2, ErrorMessage = "o nome deve ter de 2 a 150 caracteres")]
    string Nome,
    [Required(ErrorMessage = "o email e obrigatorio")]
    [EmailAddress(ErrorMessage = "email invalido")]
    [StringLength(255, ErrorMessage = "o email deve ter no maximo 255 caracteres")]
    string Email,
    [Required(ErrorMessage = "a senha e obrigatoria")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "a senha deve ter no minimo 8 caracteres")]
    string Senha);

public record AtualizarUsuarioDto(
    [Required(ErrorMessage = "o nome e obrigatorio")]
    [StringLength(150, MinimumLength = 2, ErrorMessage = "o nome deve ter de 2 a 150 caracteres")]
    string Nome,
    [Required(ErrorMessage = "o email e obrigatorio")]
    [EmailAddress(ErrorMessage = "email invalido")]
    [StringLength(255, ErrorMessage = "o email deve ter no maximo 255 caracteres")]
    string Email);

public record AlterarSenhaDto(
    [Required(ErrorMessage = "a senha atual e obrigatoria")]
    string SenhaAtual,
    [Required(ErrorMessage = "a nova senha e obrigatoria")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "a senha deve ter no minimo 8 caracteres")]
    string NovaSenha);
