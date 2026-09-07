using Livros.Api.Dtos;
using Livros.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Livros.Api.Controllers;

[ApiController]
[Route("categorias")]
[Tags("Categorias")]
public class CategoriasController(CategoriasService servico) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CategoriaDto>>> GetCategorias(
        [FromQuery] int minimoDeLivros = 1,
        [FromQuery] int limite = 500,
        CancellationToken cancelamento = default)
    {
        minimoDeLivros = Math.Max(minimoDeLivros, 1);
        limite = Math.Clamp(limite, 1, 5_000);

        var categorias = await servico.GetCategoriasAsync(minimoDeLivros, limite, cancelamento);

        return categorias.Select(categoria => categoria.ParaDto()).ToList();
    }
}
