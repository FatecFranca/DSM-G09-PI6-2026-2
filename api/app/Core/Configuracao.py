from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

DiretorioRaiz = Path(__file__).resolve().parents[2]


class Configuracao(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=DiretorioRaiz / ".env",
        env_file_encoding="utf-8",
        populate_by_name=True,
        extra="ignore",
    )

    BancoUrl: str = Field(
        default="postgresql+psycopg://postgres:postgres@localhost:5432/livros_pi",
        validation_alias="BANCO_URL",
    )

    CaminhoDataset: Path = Field(
        default=DiretorioRaiz.parent / "BooksDataset.csv",
        validation_alias="CAMINHO_DATASET",
    )

    DiretorioArtefatos: Path = Field(
        default=DiretorioRaiz / "artefatos",
        validation_alias="DIRETORIO_ARTEFATOS",
    )
    
    TotalRecomendacoes: int = Field(default=10, validation_alias="TOTAL_RECOMENDACOES")
    TamanhoPaginaPadrao: int = Field(default=20, validation_alias="TAMANHO_PAGINA_PADRAO")
    TamanhoPaginaMaximo: int = Field(default=100, validation_alias="TAMANHO_PAGINA_MAXIMO")
    EcoSql: bool = Field(default=False, validation_alias="ECO_SQL")

    def GetCaminhoDatasetAbsoluto(self) -> Path:
        caminho = Path(self.CaminhoDataset)
        return caminho if caminho.is_absolute() else (DiretorioRaiz / caminho).resolve()

    def GetDiretorioArtefatosAbsoluto(self) -> Path:
        caminho = Path(self.DiretorioArtefatos)
        return caminho if caminho.is_absolute() else (DiretorioRaiz / caminho).resolve()


@lru_cache
def GetConfiguracao() -> Configuracao:
    return Configuracao()
