import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

DiretorioRaiz = Path(__file__).resolve().parents[1]

load_dotenv(DiretorioRaiz / ".env")


@dataclass(frozen=True)
class Configuracao:
    BancoUrl: str
    ServiceBusConexao: str
    ServiceBusFila: str


@lru_cache
def GetConfiguracao() -> Configuracao:
    return Configuracao(
        BancoUrl=os.getenv("BANCO_URL", "postgresql://postgres:postgres@localhost:5432/livros_pi"),
        ServiceBusConexao=os.getenv("SERVICE_BUS_CONEXAO", "").strip(),
        ServiceBusFila=os.getenv("SERVICE_BUS_FILA", "nextread-recomendacoes").strip(),
    )
