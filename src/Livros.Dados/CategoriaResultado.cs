namespace Livros.Dados;

// resultado sem chave, usado so pela consulta de categorias
public class CategoriaResultado
{
    public string Categoria { get; set; } = null!;
    public int TotalLivros { get; set; }
}
