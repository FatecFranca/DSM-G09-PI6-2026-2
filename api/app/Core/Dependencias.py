from typing import Annotated

from fastapi import Depends, Query, Request
from sqlalchemy.orm import Session

from app.Core.BancoDados import GetSessao
from app.Core.Configuracao import GetConfiguracao
from app.Services.RecomendacaoService import ModeloRecomendacao

Configuracao = GetConfiguracao()

SessaoDependencia = Annotated[Session, Depends(GetSessao)]


def GetModeloRecomendacao(requisicao: Request) -> ModeloRecomendacao | None:
    return getattr(requisicao.app.state, "ModeloRecomendacao", None)


ModeloDependencia = Annotated[ModeloRecomendacao | None, Depends(GetModeloRecomendacao)]

PaginaDependencia = Annotated[int, Query(ge=1, description="pagina, comecando em 1")]
TamanhoPaginaDependencia = Annotated[
    int,
    Query(ge=1, le=Configuracao.TamanhoPaginaMaximo, description="itens por pagina"),
]
