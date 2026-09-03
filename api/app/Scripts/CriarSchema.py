"""cria as tabelas que faltam no banco. o schema base e do time de modelagem,
entao roda com checkfirst e so acrescenta o que nao existe (livros_similares)."""

import argparse

from sqlalchemy import inspect
from sqlalchemy.schema import CreateTable

from app.Core.BancoDados import Base, Motor
from app.Models import *  # noqa: F401,F403


def ImprimirDdl() -> None:
    for tabela in Base.metadata.sorted_tables:
        print(str(CreateTable(tabela).compile(Motor)).strip() + ";\n")


def CriarSchema() -> list[str]:
    inspetor = inspect(Motor)
    existentes = set(inspetor.get_table_names())
    faltantes = [t.name for t in Base.metadata.sorted_tables if t.name not in existentes]

    Base.metadata.create_all(Motor, checkfirst=True)
    return faltantes


def Main() -> None:
    parser = argparse.ArgumentParser(description="cria/valida o schema da api")
    parser.add_argument(
        "--imprimir", action="store_true", help="so mostra o DDL, nao toca no banco"
    )
    argumentos = parser.parse_args()

    if argumentos.imprimir:
        ImprimirDdl()
        return

    criadas = CriarSchema()
    if criadas:
        print(f"tabelas criadas: {', '.join(criadas)}")
    else:
        print("nenhuma tabela faltando, schema ja esta completo")


if __name__ == "__main__":
    Main()
