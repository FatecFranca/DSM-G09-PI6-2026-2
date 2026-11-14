using System.Text.Json;
using Azure.Messaging.ServiceBus;

namespace Livros.Api.Mensageria;

public class PublicadorServiceBus(ServiceBusSender sender, ILogger<PublicadorServiceBus> logger) : IPublicadorDeInteracoes
{
    private static readonly TimeSpan PrazoDeEnvio = TimeSpan.FromSeconds(3);

    private static readonly JsonSerializerOptions OpcoesJson = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
    };

    public static ServiceBusMessage MontarMensagem(EventoInteracao evento) =>
        new(BinaryData.FromObjectAsJson(evento, OpcoesJson))
        {
            MessageId = evento.IdEvento.ToString(),
            Subject = evento.Tipo,
            ContentType = "application/json"
        };

    public async Task PublicarAsync(EventoInteracao evento)
    {
        // prazo proprio: se o azure estiver lento, a resposta ao usuario nao fica presa.
        // o WaitAsync garante o prazo mesmo quando o sdk ignora o token (conexao tcp sem resposta)
        using var prazo = new CancellationTokenSource(PrazoDeEnvio);
        try
        {
            await sender.SendMessageAsync(MontarMensagem(evento), prazo.Token).WaitAsync(PrazoDeEnvio);
        }
        catch (Exception erro)
        {
            logger.LogWarning(erro, "Falha ao publicar interacao {IdEvento} ({Tipo}) na fila", evento.IdEvento, evento.Tipo);
        }
    }
}
