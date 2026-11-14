import json

import pytest
from azure.servicebus.exceptions import MessageLockLostError

from Consumidor.ConsumirInteracoes import AplicarDecisao, EsperaAposFalha, TratarMensagem
from Consumidor.InteracoesService import BancoIndisponivel, Decisao, Resultado


class ReceptorFalso:
    """imita o ServiceBusReceiver: so registra o que foi chamado."""

    def __init__(self, erro: Exception | None = None):
        self.Chamadas = []
        self._Erro = erro

    def _Registrar(self, *chamada):
        if self._Erro is not None:
            raise self._Erro
        self.Chamadas.append(chamada)

    def complete_message(self, mensagem):
        self._Registrar("complete", mensagem)

    def dead_letter_message(self, mensagem, reason=None, error_description=None):
        self._Registrar("dead_letter", mensagem, reason, error_description)

    def abandon_message(self, mensagem):
        self._Registrar("abandon", mensagem)


class MensagemFalsa:
    """imita o ServiceBusReceivedMessage: o corpo chega em pedacos de bytes."""

    def __init__(self, corpo: bytes):
        self.body = iter([corpo])
        self.message_id = "id-teste"


Mensagem = object()

CorpoValido = json.dumps(
    {
        "id_evento": "2b0c7c1e-5f3a-4a3e-9d6f-1c0b6e2d9a10",
        "tipo": "salvou",
        "id_usuario": 5,
        "id_livro": 123,
        "data": "2026-11-14T12:30:00+00:00",
    }
).encode("utf-8")


def TesteConcluirChamaComplete():
    receptor = ReceptorFalso()

    AplicarDecisao(receptor, Mensagem, Resultado(Decisao.Concluir, "gravada"))

    assert receptor.Chamadas == [("complete", Mensagem)]


def TesteDeadLetterLevaMotivo():
    receptor = ReceptorFalso()

    AplicarDecisao(receptor, Mensagem, Resultado(Decisao.MandarParaDeadLetter, "tipo fora da lista"))

    assert receptor.Chamadas == [("dead_letter", Mensagem, "evento-invalido", "tipo fora da lista")]


def TesteDevolverChamaAbandon():
    receptor = ReceptorFalso()

    AplicarDecisao(receptor, Mensagem, Resultado(Decisao.Devolver, "BancoIndisponivel: conexao recusada"))

    assert receptor.Chamadas == [("abandon", Mensagem)]


def TesteMensagemValidaEGravadaEConcluida():
    receptor = ReceptorFalso()
    mensagem = MensagemFalsa(CorpoValido)

    resultado = TratarMensagem(receptor, mensagem, lambda evento: True)

    assert resultado.Decisao is Decisao.Concluir
    assert receptor.Chamadas == [("complete", mensagem)]


def TesteCorpoQueNaoEUtf8VaiParaDeadLetter():
    receptor = ReceptorFalso()
    mensagem = MensagemFalsa(b"\xff\xfe{")

    resultado = TratarMensagem(receptor, mensagem, lambda evento: True)

    assert resultado.Decisao is Decisao.MandarParaDeadLetter
    assert receptor.Chamadas[0][0] == "dead_letter"


def TesteErroDoServiceBusAoConfirmarNaoDerrubaOConsumidor():
    receptor = ReceptorFalso(erro=MessageLockLostError(message="lock expirou"))

    resultado = TratarMensagem(receptor, MensagemFalsa(CorpoValido), lambda evento: True)

    assert resultado.Decisao is Decisao.Concluir


def TesteBancoForaDevolveAMensagem():
    def Gravar(evento):
        raise BancoIndisponivel("conexao recusada")

    receptor = ReceptorFalso()
    mensagem = MensagemFalsa(CorpoValido)

    resultado = TratarMensagem(receptor, mensagem, Gravar)

    assert resultado.Decisao is Decisao.Devolver
    assert receptor.Chamadas == [("abandon", mensagem)]


@pytest.mark.parametrize(
    ("falhasSeguidas", "segundos"),
    [(0, 0), (1, 5), (2, 10), (3, 30), (4, 60), (50, 60)],
)
def TesteEsperaCresceAteUmMinuto(falhasSeguidas, segundos):
    assert EsperaAposFalha(falhasSeguidas) == segundos
