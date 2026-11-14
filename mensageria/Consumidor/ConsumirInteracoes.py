"""le a fila do azure service bus e grava cada interacao em interacoes.

uso: cd mensageria && .venv/Scripts/python -m Consumidor.ConsumirInteracoes
"""

import sys
import time
from collections.abc import Callable
from datetime import datetime

from azure.servicebus import ServiceBusClient, ServiceBusReceiveMode
from azure.servicebus.exceptions import ServiceBusError

from Consumidor.BancoDados import CriarGravador
from Consumidor.Configuracao import GetConfiguracao
from Consumidor.InteracoesService import (
    Decisao,
    EventoInteracao,
    ProcessarMensagem,
    Resultado,
)

# depois de devolver uma mensagem (banco fora), espera antes de pedir a proxima;
# sem isso as 10 entregas acabam em segundos e tudo vai para a dead-letter
EsperasEmSegundos = (0, 5, 10, 30, 60)


def EsperaAposFalha(falhasSeguidas: int) -> int:
    return EsperasEmSegundos[min(falhasSeguidas, len(EsperasEmSegundos) - 1)]


def AplicarDecisao(receptor, mensagem, resultado: Resultado) -> None:
    if resultado.Decisao is Decisao.Concluir:
        receptor.complete_message(mensagem)
    elif resultado.Decisao is Decisao.MandarParaDeadLetter:
        receptor.dead_letter_message(
            mensagem, reason="evento-invalido", error_description=resultado.Motivo
        )
    else:
        receptor.abandon_message(mensagem)


def TratarMensagem(receptor, mensagem, gravar: Callable[[EventoInteracao], bool]) -> Resultado:
    try:
        corpo = b"".join(mensagem.body).decode("utf-8")
    except UnicodeDecodeError:
        resultado = Resultado(Decisao.MandarParaDeadLetter, "corpo nao e texto utf-8")
    else:
        resultado = ProcessarMensagem(corpo, gravar)

    try:
        AplicarDecisao(receptor, mensagem, resultado)
    except ServiceBusError as erro:
        # ex.: lock expirado. a mensagem volta sozinha para a fila e o on conflict evita duplicar
        print(f"nao foi possivel confirmar {mensagem.message_id}: {type(erro).__name__}")
    return resultado


def _FilaDaConexao(conexao: str, filaPadrao: str) -> str:
    # politica criada na propria fila traz EntityPath; ele manda sobre o .env
    for parte in conexao.split(";"):
        chave, _, valor = parte.partition("=")
        if chave.strip().lower() == "entitypath" and valor.strip():
            return valor.strip()
    return filaPadrao


def Main() -> None:
    configuracao = GetConfiguracao()
    if not configuracao.ServiceBusConexao:
        print("defina SERVICE_BUS_CONEXAO no mensageria/.env (veja o .env.example)")
        sys.exit(1)

    fila = _FilaDaConexao(configuracao.ServiceBusConexao, configuracao.ServiceBusFila)
    gravar = CriarGravador(configuracao.BancoUrl)
    falhasSeguidas = 0

    cliente = ServiceBusClient.from_connection_string(configuracao.ServiceBusConexao)
    print(f"ouvindo a fila {fila} (ctrl+c para sair)")
    try:
        with cliente, cliente.get_queue_receiver(
            queue_name=fila, receive_mode=ServiceBusReceiveMode.PEEK_LOCK
        ) as receptor:
            for mensagem in receptor:
                resultado = TratarMensagem(receptor, mensagem, gravar)
                hora = datetime.now().strftime("%H:%M:%S")
                print(f"{hora} {mensagem.message_id} {resultado.Decisao.value} {resultado.Motivo}")

                falhasSeguidas = falhasSeguidas + 1 if resultado.Decisao is Decisao.Devolver else 0
                if espera := EsperaAposFalha(falhasSeguidas):
                    print(f"aguardando {espera}s antes da proxima tentativa")
                    time.sleep(espera)
    except KeyboardInterrupt:
        print("encerrando consumidor")


if __name__ == "__main__":
    Main()
