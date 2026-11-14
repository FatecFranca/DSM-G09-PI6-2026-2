using Livros.Api.Mensageria;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Livros.Api.Testes.Mensageria;

public class RegistroMensageriaTestes
{
    private const string ConexaoValida =
        "Endpoint=sb://teste.servicebus.windows.net/;SharedAccessKeyName=x;SharedAccessKey=eA==";

    private static IPublicadorDeInteracoes Resolver(string? conexao, string? fila = null)
    {
        var valores = new Dictionary<string, string?> { ["ServiceBus:Conexao"] = conexao };
        if (fila is not null) valores["ServiceBus:Fila"] = fila;
        var configuracao = new ConfigurationBuilder().AddInMemoryCollection(valores).Build();

        var servicos = new ServiceCollection().AddLogging();
        servicos.AdicionarMensageria(configuracao);
        return servicos.BuildServiceProvider().GetRequiredService<IPublicadorDeInteracoes>();
    }

    [Fact]
    public void SemConexao_RegistraDesligado()
    {
        Assert.IsType<PublicadorDesligado>(Resolver(null));
        Assert.IsType<PublicadorDesligado>(Resolver("   "));
    }

    [Fact]
    public void ConexaoMalformada_RegistraDesligado()
    {
        var erro = Record.Exception(() => Assert.IsType<PublicadorDesligado>(Resolver("isso nao e uma connection string")));

        Assert.Null(erro);
    }

    [Fact]
    public void ConexaoValida_RegistraServiceBus()
    {
        Assert.IsType<PublicadorServiceBus>(Resolver(ConexaoValida));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void ConexaoValida_FilaVazia_RegistraDesligado(string fila)
    {
        var erro = Record.Exception(() => Assert.IsType<PublicadorDesligado>(Resolver(ConexaoValida, fila)));

        Assert.Null(erro);
    }

    [Fact]
    public void ConexaoDaFila_ComEntityPathDiferenteDaFilaConfigurada_UsaEntityPath()
    {
        // a politica criada no portal fica na fila, entao a connection string ja traz EntityPath
        var conexaoDaFila = ConexaoValida + ";EntityPath=nextread-recomendacoes";

        var erro = Record.Exception(() => Assert.IsType<PublicadorServiceBus>(Resolver(conexaoDaFila, fila: "outra-fila")));

        Assert.Null(erro);
    }
}
