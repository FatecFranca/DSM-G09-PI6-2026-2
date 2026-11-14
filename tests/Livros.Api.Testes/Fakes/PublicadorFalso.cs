using Livros.Api.Mensageria;

namespace Livros.Api.Testes.Fakes;

public class PublicadorFalso : IPublicadorDeInteracoes
{
    public List<EventoInteracao> Publicados { get; } = [];

    public Task PublicarAsync(EventoInteracao evento)
    {
        Publicados.Add(evento);
        return Task.CompletedTask;
    }
}
