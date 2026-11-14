using Azure.Messaging.ServiceBus;

namespace Livros.Api.Testes.Fakes;

// sender do service bus sem rede: guarda o que foi enviado ou lanca o erro configurado
public class SenderFalso : ServiceBusSender
{
    public List<ServiceBusMessage> Enviadas { get; } = [];
    public Exception? ErroAoEnviar { get; set; }

    // imita o sdk abrindo conexao tcp com o azure sem resposta: ignora o token de cancelamento
    public TimeSpan? DemoraIgnorandoToken { get; set; }

    public override async Task SendMessageAsync(ServiceBusMessage message, CancellationToken cancellationToken = default)
    {
        if (DemoraIgnorandoToken is { } demora) await Task.Delay(demora);
        if (ErroAoEnviar is not null) throw ErroAoEnviar;
        Enviadas.Add(message);
    }
}
