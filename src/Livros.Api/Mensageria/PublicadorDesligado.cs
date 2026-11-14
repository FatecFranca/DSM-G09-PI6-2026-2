namespace Livros.Api.Mensageria;

// usado quando o service bus nao esta configurado (ex.: render sem a connection string)
public class PublicadorDesligado(ILogger<PublicadorDesligado> logger) : IPublicadorDeInteracoes
{
    public Task PublicarAsync(EventoInteracao evento)
    {
        logger.LogDebug("Mensageria desligada; interacao {IdEvento} ({Tipo}) nao publicada", evento.IdEvento, evento.Tipo);
        return Task.CompletedTask;
    }
}
