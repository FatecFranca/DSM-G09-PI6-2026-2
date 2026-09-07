using Livros.Api.Dtos;
using Livros.Dados;
using Livros.Dominio.Entidades;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Livros.Api.Services;

public enum ResultadoDeUsuario
{
    Ok,
    NaoEncontrado,
    EmailEmUso,
    SenhaAtualIncorreta,
}

public class UsuariosService(ContextoLivros contexto)
{
    private readonly PasswordHasher<Usuario> _geradorDeHash = new();

    public async Task<(IReadOnlyList<Usuario> Itens, int Total)> GetUsuariosAsync(
        int pagina,
        int tamanhoPagina,
        string? busca,
        CancellationToken cancelamento)
    {
        var consulta = contexto.Usuarios.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(busca))
        {
            var padrao = Filtros.MontarPadraoDeBusca(busca);
            consulta = consulta.Where(usuario =>
                EF.Functions.ILike(usuario.Nome, padrao) || EF.Functions.ILike(usuario.Email, padrao));
        }

        var total = await consulta.CountAsync(cancelamento);
        if (total == 0)
        {
            return ([], 0);
        }

        var itens = await consulta
            .OrderBy(usuario => usuario.Nome)
            .ThenBy(usuario => usuario.IdUsuario)
            .Skip((pagina - 1) * tamanhoPagina)
            .Take(tamanhoPagina)
            .ToListAsync(cancelamento);

        return (itens, total);
    }

    public Task<Usuario?> GetUsuarioPorIdAsync(long idUsuario, CancellationToken cancelamento) =>
        contexto.Usuarios.AsNoTracking().FirstOrDefaultAsync(usuario => usuario.IdUsuario == idUsuario, cancelamento);

    public async Task<(ResultadoDeUsuario Resultado, Usuario? Usuario)> CriarUsuarioAsync(
        CriarUsuarioDto dados,
        CancellationToken cancelamento)
    {
        var email = dados.Email.Trim().ToLowerInvariant();

        if (await contexto.Usuarios.AnyAsync(usuario => usuario.Email == email, cancelamento))
        {
            return (ResultadoDeUsuario.EmailEmUso, null);
        }

        var usuarioNovo = new Usuario
        {
            Nome = dados.Nome.Trim(),
            Email = email,
        };
        usuarioNovo.SenhaHash = _geradorDeHash.HashPassword(usuarioNovo, dados.Senha);

        contexto.Usuarios.Add(usuarioNovo);
        await contexto.SaveChangesAsync(cancelamento);

        return (ResultadoDeUsuario.Ok, usuarioNovo);
    }

    public async Task<(ResultadoDeUsuario Resultado, Usuario? Usuario)> AtualizarUsuarioAsync(
        long idUsuario,
        AtualizarUsuarioDto dados,
        CancellationToken cancelamento)
    {
        var usuario = await contexto.Usuarios.FirstOrDefaultAsync(item => item.IdUsuario == idUsuario, cancelamento);
        if (usuario is null)
        {
            return (ResultadoDeUsuario.NaoEncontrado, null);
        }

        var email = dados.Email.Trim().ToLowerInvariant();

        var emailOcupado = await contexto.Usuarios
            .AnyAsync(item => item.Email == email && item.IdUsuario != idUsuario, cancelamento);
        if (emailOcupado)
        {
            return (ResultadoDeUsuario.EmailEmUso, null);
        }

        usuario.Nome = dados.Nome.Trim();
        usuario.Email = email;
        await contexto.SaveChangesAsync(cancelamento);

        return (ResultadoDeUsuario.Ok, usuario);
    }

    public async Task<ResultadoDeUsuario> AlterarSenhaAsync(
        long idUsuario,
        AlterarSenhaDto dados,
        CancellationToken cancelamento)
    {
        var usuario = await contexto.Usuarios.FirstOrDefaultAsync(item => item.IdUsuario == idUsuario, cancelamento);
        if (usuario is null)
        {
            return ResultadoDeUsuario.NaoEncontrado;
        }

        var conferencia = _geradorDeHash.VerifyHashedPassword(usuario, usuario.SenhaHash, dados.SenhaAtual);
        if (conferencia == PasswordVerificationResult.Failed)
        {
            return ResultadoDeUsuario.SenhaAtualIncorreta;
        }

        usuario.SenhaHash = _geradorDeHash.HashPassword(usuario, dados.NovaSenha);
        await contexto.SaveChangesAsync(cancelamento);

        return ResultadoDeUsuario.Ok;
    }

    public async Task<ResultadoDeUsuario> RemoverUsuarioAsync(long idUsuario, CancellationToken cancelamento)
    {
        var usuario = await contexto.Usuarios.FirstOrDefaultAsync(item => item.IdUsuario == idUsuario, cancelamento);
        if (usuario is null)
        {
            return ResultadoDeUsuario.NaoEncontrado;
        }

        contexto.Usuarios.Remove(usuario);
        await contexto.SaveChangesAsync(cancelamento);

        return ResultadoDeUsuario.Ok;
    }
}
