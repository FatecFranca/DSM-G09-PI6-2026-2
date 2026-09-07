namespace Livros.Api.Configuracoes;

public class OpcoesDaApi
{
    public const string Secao = "Api";

    public int TamanhoPaginaPadrao { get; set; } = 20;
    public int TamanhoPaginaMaximo { get; set; } = 100;
    public int TotalRecomendacoes { get; set; } = 10;

    public int NormalizarTamanhoPagina(int? tamanhoPagina) =>
        Math.Clamp(tamanhoPagina ?? TamanhoPaginaPadrao, 1, TamanhoPaginaMaximo);
}
