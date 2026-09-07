namespace Livros.Dominio.Entidades;

public static class TiposDeInteracao
{
    public const string Visualizacao = "visualizacao";
    public const string Salvou = "salvou";
    public const string RemoveuSalvo = "removeu_salvo";

    public static readonly string[] Todos = [Visualizacao, Salvou, RemoveuSalvo];

    public static bool EhValido(string tipo) => Todos.Contains(tipo);
}
