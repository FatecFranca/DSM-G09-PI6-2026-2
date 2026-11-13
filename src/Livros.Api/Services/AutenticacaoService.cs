using Livros.Api.Dtos;
using Livros.Dados;
using Livros.Dominio.Entidades;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Livros.Api.Services;

public class AutenticacaoService(ContextoLivros contexto)
{
    private readonly PasswordHasher<Usuario> _hasher = new();

    public async Task<Usuario?> EntrarAsync(EntrarDto dados, CancellationToken cancelamento)
    {
        var email = dados.Email.Trim().ToLowerInvariant();
        var usuario = await contexto.Usuarios.FirstOrDefaultAsync(x => x.Email == email, cancelamento);
        if (usuario is null) return null;

        var resultado = _hasher.VerifyHashedPassword(usuario, usuario.SenhaHash, dados.Senha);
        if (resultado == PasswordVerificationResult.Failed) return null;
        if (resultado == PasswordVerificationResult.SuccessRehashNeeded)
        {
            usuario.SenhaHash = _hasher.HashPassword(usuario, dados.Senha);
            await contexto.SaveChangesAsync(cancelamento);
        }
        return usuario;
    }

    public async Task<(bool Criado, Usuario? Usuario)> CadastrarAsync(CriarUsuarioDto dados, CancellationToken cancelamento)
    {
        var email = dados.Email.Trim().ToLowerInvariant();
        if (await contexto.Usuarios.AnyAsync(x => x.Email == email, cancelamento)) return (false, null);
        var usuario = new Usuario { Nome = dados.Nome.Trim(), Email = email };
        usuario.SenhaHash = _hasher.HashPassword(usuario, dados.Senha);
        contexto.Usuarios.Add(usuario);
        try
        {
            await contexto.SaveChangesAsync(cancelamento);
        }
        catch (DbUpdateException erro) when (erro.InnerException is PostgresException sql && sql.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            contexto.Entry(usuario).State = EntityState.Detached;
            return (false, null);
        }
        return (true, usuario);
    }
}
