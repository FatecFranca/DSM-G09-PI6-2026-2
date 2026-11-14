"""decide o que fazer com cada mensagem da fila, sem depender do azure nem do banco."""

import json
import uuid
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from enum import Enum

# mesmos valores do CHECK da tabela interacoes
TiposPermitidos = frozenset({"visualizacao", "salvou", "removeu_salvo"})


class EventoInvalido(Exception):
    """a mensagem nunca vai poder ser gravada: reenviar nao adianta."""


class ReferenciaInexistente(Exception):
    """usuario ou livro do evento nao existe no banco."""


class BancoIndisponivel(Exception):
    """erro passageiro de conexao: a mensagem deve voltar para a fila."""


class Decisao(Enum):
    Concluir = "concluir"
    MandarParaDeadLetter = "dead-letter"
    Devolver = "devolver"


@dataclass(frozen=True)
class EventoInteracao:
    IdEvento: uuid.UUID
    Tipo: str
    IdUsuario: int
    IdLivro: int
    Data: datetime


@dataclass(frozen=True)
class Resultado:
    Decisao: Decisao
    Motivo: str


def _LerId(dados: dict, campo: str) -> int:
    valor = dados.get(campo)
    # bool e subclasse de int no python, entao precisa ser recusado a parte
    if not isinstance(valor, int) or isinstance(valor, bool) or valor <= 0:
        raise EventoInvalido(f"{campo} deve ser inteiro positivo")
    return valor


def LerEvento(corpo: str) -> EventoInteracao:
    try:
        dados = json.loads(corpo)
    except json.JSONDecodeError as erro:
        raise EventoInvalido("corpo nao e json") from erro
    if not isinstance(dados, dict):
        raise EventoInvalido("corpo nao e um objeto json")

    tipo = dados.get("tipo")
    # lista ou dicionario nao sao "hashable" e quebrariam o teste de pertinencia
    if not isinstance(tipo, str) or tipo not in TiposPermitidos:
        raise EventoInvalido("tipo fora da lista")

    try:
        idEvento = uuid.UUID(str(dados["id_evento"]))
    except (KeyError, ValueError) as erro:
        raise EventoInvalido("id_evento ausente ou invalido") from erro

    try:
        data = datetime.fromisoformat(dados["data"])
    except (KeyError, TypeError, ValueError) as erro:
        raise EventoInvalido("data ausente ou invalida") from erro

    return EventoInteracao(
        IdEvento=idEvento,
        Tipo=tipo,
        IdUsuario=_LerId(dados, "id_usuario"),
        IdLivro=_LerId(dados, "id_livro"),
        Data=data,
    )


def ProcessarMensagem(corpo: str, gravar: Callable[[EventoInteracao], bool]) -> Resultado:
    try:
        evento = LerEvento(corpo)
    except EventoInvalido as erro:
        return Resultado(Decisao.MandarParaDeadLetter, str(erro))
    except Exception as erro:
        # formato que a validacao nao previu: reenviar tambem nunca daria certo
        return Resultado(Decisao.MandarParaDeadLetter, f"evento ilegivel ({type(erro).__name__})")

    try:
        inserida = gravar(evento)
    except ReferenciaInexistente as erro:
        return Resultado(Decisao.MandarParaDeadLetter, str(erro))
    except Exception as erro:
        # o service bus manda para a dead-letter sozinho depois de 10 entregas
        return Resultado(Decisao.Devolver, f"{type(erro).__name__}: {erro}")

    return Resultado(Decisao.Concluir, "gravada" if inserida else "duplicada")
