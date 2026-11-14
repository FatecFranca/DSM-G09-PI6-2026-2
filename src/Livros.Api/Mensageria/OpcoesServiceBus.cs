namespace Livros.Api.Mensageria;

// secao "ServiceBus" do appsettings (no render: ServiceBus__Conexao e ServiceBus__Fila)
public class OpcoesServiceBus
{
    public const string Secao = "ServiceBus";

    public string? Conexao { get; set; }
    public string Fila { get; set; } = "nextread-recomendacoes";
}
