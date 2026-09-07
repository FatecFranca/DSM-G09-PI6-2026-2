namespace Livros.Api.Dtos;

public record PaginaDto<TItem>(
    IReadOnlyList<TItem> Itens,
    int Total,
    int Pagina,
    int TamanhoPagina,
    int TotalPaginas)
{
    public static PaginaDto<TItem> Montar(IReadOnlyList<TItem> itens, int total, int pagina, int tamanhoPagina)
    {
        var totalPaginas = tamanhoPagina > 0 ? (total + tamanhoPagina - 1) / tamanhoPagina : 0;
        return new PaginaDto<TItem>(itens, total, pagina, tamanhoPagina, totalPaginas);
    }
}
