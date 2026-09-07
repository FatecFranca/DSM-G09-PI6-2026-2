import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

DiretorioRaiz = Path(__file__).resolve().parents[1]

load_dotenv(DiretorioRaiz / ".env")


def _Absoluto(caminho: str) -> Path:
    resolvido = Path(caminho)
    return resolvido if resolvido.is_absolute() else (DiretorioRaiz / resolvido).resolve()


@dataclass(frozen=True)
class Configuracao:
    BancoUrl: str
    CaminhoDataset: Path
    DiretorioArtefatos: Path
    TotalRecomendacoes: int


@lru_cache
def GetConfiguracao() -> Configuracao:
    return Configuracao(
        BancoUrl=os.getenv("BANCO_URL", "postgresql://postgres:postgres@localhost:5432/livros_pi"),
        CaminhoDataset=_Absoluto(os.getenv("CAMINHO_DATASET", "../BooksDataset.csv")),
        DiretorioArtefatos=_Absoluto(os.getenv("DIRETORIO_ARTEFATOS", "./artefatos")),
        TotalRecomendacoes=int(os.getenv("TOTAL_RECOMENDACOES", "10")),
    )
