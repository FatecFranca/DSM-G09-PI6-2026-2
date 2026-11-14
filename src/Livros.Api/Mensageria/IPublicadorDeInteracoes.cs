namespace Livros.Api.Mensageria;

// envia o evento para a fila sem nunca derrubar a requisicao que o originou
public interface IPublicadorDeInteracoes
{
    Task PublicarAsync(EventoInteracao evento);
}
