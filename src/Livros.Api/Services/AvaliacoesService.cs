using Livros.Dados;
using Livros.Dominio.Entidades;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Livros.Api.Services;

public enum ResultadoAvaliacao { Salva, NotaInvalida, LivroNaoEncontrado, Removida, NaoEncontrada }

public class AvaliacoesService(ContextoLivros contexto)
{
    public const int NotaMinima = 1;
    public const int NotaMaxima = 5;

    public async Task<int?> ObterNotaAsync(long idUsuario, long idLivro, CancellationToken ct)
    {
        try
        {
            return await contexto.Avaliacoes.AsNoTracking()
                .Where(avaliacao => avaliacao.IdUsuario == idUsuario && avaliacao.IdLivro == idLivro)
                .Select(avaliacao => (int?)avaliacao.Nota)
                .FirstOrDefaultAsync(ct);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UndefinedTable)
        {
            // banco sem o 05_avaliacoes.sql: ninguem avaliou nada ainda
            return null;
        }
    }

    public async Task<ResultadoAvaliacao> AvaliarAsync(long idUsuario, long idLivro, int nota, CancellationToken ct)
    {
        if (nota is < NotaMinima or > NotaMaxima) return ResultadoAvaliacao.NotaInvalida;
        if (!await contexto.Livros.AnyAsync(livro => livro.IdLivro == idLivro, ct)) return ResultadoAvaliacao.LivroNaoEncontrado;

        var avaliacao = await contexto.Avaliacoes
            .FirstOrDefaultAsync(x => x.IdUsuario == idUsuario && x.IdLivro == idLivro, ct);
        if (avaliacao is null)
        {
            contexto.Avaliacoes.Add(new Avaliacao { IdUsuario = idUsuario, IdLivro = idLivro, Nota = (short)nota });
        }
        else
        {
            avaliacao.Nota = (short)nota;
            avaliacao.AvaliadoEm = DateTimeOffset.UtcNow;
        }

        await contexto.SaveChangesAsync(ct);
        return ResultadoAvaliacao.Salva;
    }

    public async Task<ResultadoAvaliacao> RemoverAsync(long idUsuario, long idLivro, CancellationToken ct)
    {
        var avaliacao = await contexto.Avaliacoes
            .FirstOrDefaultAsync(x => x.IdUsuario == idUsuario && x.IdLivro == idLivro, ct);
        if (avaliacao is null) return ResultadoAvaliacao.NaoEncontrada;

        contexto.Avaliacoes.Remove(avaliacao);
        await contexto.SaveChangesAsync(ct);
        return ResultadoAvaliacao.Removida;
    }
}
