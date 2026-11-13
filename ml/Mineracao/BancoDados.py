from __future__ import annotations
from collections.abc import Iterator
from contextlib import contextmanager

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import psycopg

from Mineracao.Configuracao import GetConfiguracao


@contextmanager
def AbrirConexao() -> Iterator[psycopg.Connection]:
    # o schema e definido pelas migrations do EF Core; aqui so lemos e gravamos linhas
    import psycopg

    with psycopg.connect(GetConfiguracao().BancoUrl) as conexao:
        yield conexao


def ContarLivros() -> int:
    with AbrirConexao() as conexao, conexao.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM livros")
        return int(cursor.fetchone()[0])
