import json
import uuid
from datetime import datetime, timedelta

import pytest

from Consumidor.InteracoesService import (
    BancoIndisponivel,
    Decisao,
    EventoInvalido,
    LerEvento,
    ProcessarMensagem,
    ReferenciaInexistente,
)

Valido = {
    "id_evento": "2b0c7c1e-5f3a-4a3e-9d6f-1c0b6e2d9a10",
    "tipo": "salvou",
    "id_usuario": 5,
    "id_livro": 123,
    "data": "2026-11-14T12:30:00+00:00",
}


def _Corpo(**alteracoes) -> str:
    dados = {**Valido, **alteracoes}
    return json.dumps(dados)


def _NaoDeveGravar(evento):
    raise AssertionError("gravar nao deveria ser chamado para evento invalido")


def _AssertDeadLetter(corpo: str):
    resultado = ProcessarMensagem(corpo, _NaoDeveGravar)
    assert resultado.Decisao is Decisao.MandarParaDeadLetter
    assert resultado.Motivo


def TesteEventoValidoELido():
    evento = LerEvento(json.dumps(Valido))

    assert evento.IdEvento == uuid.UUID("2b0c7c1e-5f3a-4a3e-9d6f-1c0b6e2d9a10")
    assert evento.Tipo == "salvou"
    assert evento.IdUsuario == 5
    assert evento.IdLivro == 123
    assert evento.Data.utcoffset() == timedelta(0)
    assert evento.Data == datetime.fromisoformat("2026-11-14T12:30:00+00:00")


def TesteEventoValidoGravadoConclui():
    gravados = []

    resultado = ProcessarMensagem(json.dumps(Valido), lambda evento: gravados.append(evento) or True)

    assert resultado.Decisao is Decisao.Concluir
    assert resultado.Motivo == "gravada"
    assert [evento.IdLivro for evento in gravados] == [123]


def TesteEventoDuplicadoConclui():
    resultado = ProcessarMensagem(json.dumps(Valido), lambda evento: False)

    assert resultado.Decisao is Decisao.Concluir
    assert resultado.Motivo == "duplicada"


@pytest.mark.parametrize("corpo", ["{", "[]", "5", '"x"', ""])
def TesteCorpoQueNaoEObjetoVaiParaDeadLetter(corpo):
    _AssertDeadLetter(corpo)


@pytest.mark.parametrize("campo", ["id_evento", "tipo", "id_usuario", "id_livro", "data"])
def TesteCampoFaltandoVaiParaDeadLetter(campo):
    dados = {chave: valor for chave, valor in Valido.items() if chave != campo}

    _AssertDeadLetter(json.dumps(dados))


def TesteTipoForaDaListaVaiParaDeadLetter():
    _AssertDeadLetter(_Corpo(tipo="comprou"))


@pytest.mark.parametrize("tipo", [[], {}, 5, None])
def TesteTipoQueNaoETextoVaiParaDeadLetter(tipo):
    _AssertDeadLetter(_Corpo(tipo=tipo))


@pytest.mark.parametrize("campo", ["id_usuario", "id_livro"])
@pytest.mark.parametrize("valor", [0, -1, "5", 1.5, True, None])
def TesteIdInvalidoVaiParaDeadLetter(campo, valor):
    _AssertDeadLetter(_Corpo(**{campo: valor}))


def TesteIdEventoQueNaoEUuidVaiParaDeadLetter():
    _AssertDeadLetter(_Corpo(id_evento="abc"))


def TesteDataInvalidaVaiParaDeadLetter():
    _AssertDeadLetter(_Corpo(data="ontem"))


def TesteLerEventoInvalidoLancaEventoInvalido():
    with pytest.raises(EventoInvalido):
        LerEvento(_Corpo(tipo="comprou"))


def TesteReferenciaInexistenteVaiParaDeadLetter():
    def Gravar(evento):
        raise ReferenciaInexistente("livro 123 nao existe")

    resultado = ProcessarMensagem(json.dumps(Valido), Gravar)

    assert resultado.Decisao is Decisao.MandarParaDeadLetter
    assert "123" in resultado.Motivo


def TesteBancoIndisponivelDevolve():
    def Gravar(evento):
        raise BancoIndisponivel("conexao recusada")

    assert ProcessarMensagem(json.dumps(Valido), Gravar).Decisao is Decisao.Devolver


def TesteErroInesperadoDevolve():
    def Gravar(evento):
        raise RuntimeError("bug")

    assert ProcessarMensagem(json.dumps(Valido), Gravar).Decisao is Decisao.Devolver
