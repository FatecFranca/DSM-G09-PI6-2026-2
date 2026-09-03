from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.Core.Configuracao import GetConfiguracao

Configuracao = GetConfiguracao()

Motor = create_engine(
    Configuracao.BancoUrl,
    echo=Configuracao.EcoSql,
    pool_pre_ping=True,
    future=True,
)

CriarSessao = sessionmaker(bind=Motor, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def GetSessao() -> Iterator[Session]:
    with CriarSessao() as sessao:
        yield sessao


def GetConexaoBruta():
    # conexao psycopg pura, usada pelo COPY da ingestao
    return Motor.raw_connection()
