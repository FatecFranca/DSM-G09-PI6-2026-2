using System.Text.Json;
using Azure.Messaging.ServiceBus;
using Livros.Api.Mensageria;
using Livros.Dominio.Entidades;
using Livros.Api.Testes.Fakes;
using Microsoft.Extensions.Logging.Abstractions;

namespace Livros.Api.Testes.Mensageria;

public class PublicadorServiceBusTestes
{
    private static readonly EventoInteracao EventoExemplo = new(
        Guid.Parse("2b0c7c1e-5f3a-4a3e-9d6f-1c0b6e2d9a10"),
        TiposDeInteracao.Salvou,
        5,
        123,
        DateTimeOffset.Parse("2026-11-14T12:30:00+00:00"));

    [Fact]
    public void MontarMensagem_UsaSnakeCaseEMetadados()
    {
        var mensagem = PublicadorServiceBus.MontarMensagem(EventoExemplo);

        using var json = JsonDocument.Parse(mensagem.Body.ToString());
        var raiz = json.RootElement;
        Assert.Equal("2b0c7c1e-5f3a-4a3e-9d6f-1c0b6e2d9a10", raiz.GetProperty("id_evento").GetString());
        Assert.Equal("salvou", raiz.GetProperty("tipo").GetString());
        Assert.Equal(5, raiz.GetProperty("id_usuario").GetInt64());
        Assert.Equal(123, raiz.GetProperty("id_livro").GetInt64());
        Assert.Equal(DateTimeOffset.Parse("2026-11-14T12:30:00+00:00"), raiz.GetProperty("data").GetDateTimeOffset());
        Assert.Equal("2b0c7c1e-5f3a-4a3e-9d6f-1c0b6e2d9a10", mensagem.MessageId);
        Assert.Equal("salvou", mensagem.Subject);
        Assert.Equal("application/json", mensagem.ContentType);
    }

    [Fact]
    public async Task PublicarAsync_EnviaUmaMensagem()
    {
        var sender = new SenderFalso();
        var publicador = new PublicadorServiceBus(sender, NullLogger<PublicadorServiceBus>.Instance);

        await publicador.PublicarAsync(EventoExemplo);

        var enviada = Assert.Single(sender.Enviadas);
        Assert.Equal("2b0c7c1e-5f3a-4a3e-9d6f-1c0b6e2d9a10", enviada.MessageId);
    }

    [Fact]
    public async Task PublicarAsync_ErroNoSenderNaoPropaga()
    {
        var sender = new SenderFalso
        {
            ErroAoEnviar = new ServiceBusException("fila fora do ar", ServiceBusFailureReason.ServiceCommunicationProblem)
        };
        var publicador = new PublicadorServiceBus(sender, NullLogger<PublicadorServiceBus>.Instance);

        var erro = await Record.ExceptionAsync(() => publicador.PublicarAsync(EventoExemplo));

        Assert.Null(erro);
    }

    [Fact]
    public async Task PublicarAsync_SenderQueIgnoraOToken_VoltaEmAte4Segundos()
    {
        var sender = new SenderFalso { DemoraIgnorandoToken = TimeSpan.FromSeconds(10) };
        var publicador = new PublicadorServiceBus(sender, NullLogger<PublicadorServiceBus>.Instance);
        var cronometro = System.Diagnostics.Stopwatch.StartNew();

        await publicador.PublicarAsync(EventoExemplo);

        Assert.True(cronometro.Elapsed < TimeSpan.FromSeconds(4), $"demorou {cronometro.Elapsed}");
    }

    [Fact]
    public async Task PublicadorDesligado_NaoLanca()
    {
        var publicador = new PublicadorDesligado(NullLogger<PublicadorDesligado>.Instance);

        var erro = await Record.ExceptionAsync(() => publicador.PublicarAsync(EventoExemplo));

        Assert.Null(erro);
    }

    [Fact]
    public void EventoCriar_GeraIdEDataAtual()
    {
        var evento = EventoInteracao.Criar(TiposDeInteracao.Visualizacao, 1, 10);

        Assert.NotEqual(Guid.Empty, evento.IdEvento);
        Assert.Equal("visualizacao", evento.Tipo);
        Assert.Equal(1, evento.IdUsuario);
        Assert.Equal(10, evento.IdLivro);
        Assert.True(DateTimeOffset.UtcNow - evento.Data < TimeSpan.FromSeconds(5));
    }
}
