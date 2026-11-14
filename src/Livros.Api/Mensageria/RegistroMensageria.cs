using Azure.Messaging.ServiceBus;

namespace Livros.Api.Mensageria;

public static class RegistroMensageria
{
    // sem connection string valida a api continua funcionando, so nao publica
    public static IServiceCollection AdicionarMensageria(this IServiceCollection servicos, IConfiguration configuracao)
    {
        var opcoes = configuracao.GetSection(OpcoesServiceBus.Secao).Get<OpcoesServiceBus>() ?? new OpcoesServiceBus();

        if (string.IsNullOrWhiteSpace(opcoes.Conexao))
            return RegistrarDesligado(servicos, motivo: null);

        ServiceBusClient cliente;
        ServiceBusSender sender;
        try
        {
            // a politica criada na propria fila traz EntityPath, que tem prioridade sobre a fila configurada
            var fila = ServiceBusConnectionStringProperties.Parse(opcoes.Conexao).EntityPath ?? opcoes.Fila;
            cliente = new ServiceBusClient(opcoes.Conexao);
            // criado aqui (e nao sob demanda) para que fila vazia ou invalida caia no desligado
            sender = cliente.CreateSender(fila);
        }
        catch (Exception erro) when (erro is FormatException or ArgumentException)
        {
            return RegistrarDesligado(servicos, motivo: "connection string ou fila do Service Bus invalida");
        }

        servicos.AddSingleton(_ => cliente);
        servicos.AddSingleton(_ => sender);
        servicos.AddSingleton<IPublicadorDeInteracoes>(provedor => new PublicadorServiceBus(
            provedor.GetRequiredService<ServiceBusSender>(),
            provedor.GetRequiredService<ILogger<PublicadorServiceBus>>()));
        return servicos;
    }

    private static IServiceCollection RegistrarDesligado(IServiceCollection servicos, string? motivo) =>
        servicos.AddSingleton<IPublicadorDeInteracoes>(provedor =>
        {
            var logger = provedor.GetRequiredService<ILogger<PublicadorDesligado>>();
            if (motivo is not null)
                logger.LogWarning("Mensageria desligada: {Motivo}", motivo);
            return new PublicadorDesligado(logger);
        });
}
