using Livros.Api.Dtos;
using Livros.Dados;
using Livros.Dominio.Entidades;
using Microsoft.EntityFrameworkCore;

namespace Livros.Api.Services;

public enum ResultadoSalvo { Criado, JaExistia, UsuarioNaoEncontrado, LivroNaoEncontrado, Removido, NaoEncontrado }

public class LivrosSalvosService(ContextoLivros contexto)
{
    public async Task<IReadOnlyList<LivroSalvoDto>?> ListarAsync(long usuarioId, CancellationToken ct)
    {
        if (!await contexto.Usuarios.AnyAsync(x => x.IdUsuario == usuarioId, ct)) return null;
        var registros = await contexto.LivrosSalvos.AsNoTracking().Include(x => x.Livro)
            .Where(x => x.IdUsuario == usuarioId)
            .OrderByDescending(x => x.DataSalvo).ThenByDescending(x => x.IdSalvo)
            .ToListAsync(ct);
        return registros.Select(x => new LivroSalvoDto(x.IdSalvo, x.DataSalvo, x.Livro.ParaResumo())).ToList();
    }

    public async Task<(ResultadoSalvo Resultado, LivroSalvoDto? Salvo)> SalvarAsync(long usuarioId, long livroId, CancellationToken ct)
    {
        if (!await contexto.Usuarios.AnyAsync(x => x.IdUsuario == usuarioId, ct))
            return (ResultadoSalvo.UsuarioNaoEncontrado, null);
        var livro = await contexto.Livros.AsNoTracking().FirstOrDefaultAsync(x => x.IdLivro == livroId, ct);
        if (livro is null) return (ResultadoSalvo.LivroNaoEncontrado, null);
        var salvo = await contexto.LivrosSalvos.FirstOrDefaultAsync(x => x.IdUsuario == usuarioId && x.IdLivro == livroId, ct);
        if (salvo is not null) return (ResultadoSalvo.JaExistia, new(salvo.IdSalvo, salvo.DataSalvo, livro.ParaResumo()));
        salvo = new LivroSalvo { IdUsuario = usuarioId, IdLivro = livroId };
        contexto.LivrosSalvos.Add(salvo);
        await contexto.SaveChangesAsync(ct);
        return (ResultadoSalvo.Criado, new(salvo.IdSalvo, salvo.DataSalvo, livro.ParaResumo()));
    }

    public async Task<ResultadoSalvo> RemoverAsync(long usuarioId, long livroId, CancellationToken ct)
    {
        if (!await contexto.Usuarios.AnyAsync(x => x.IdUsuario == usuarioId, ct)) return ResultadoSalvo.UsuarioNaoEncontrado;
        var registro = await contexto.LivrosSalvos.FirstOrDefaultAsync(x => x.IdUsuario == usuarioId && x.IdLivro == livroId, ct);
        if (registro is null) return ResultadoSalvo.NaoEncontrado;
        contexto.LivrosSalvos.Remove(registro);
        await contexto.SaveChangesAsync(ct);
        return ResultadoSalvo.Removido;
    }
}
