import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.Controllers import CategoriasController, LivrosController, RecomendacoesController
from app.Core.BancoDados import CriarSessao
from app.Core.Configuracao import GetConfiguracao
from app.Models import *  # noqa: F401,F403  registra os mapeamentos do sqlalchemy
from app.Services import RecomendacaoService

Configuracao = GetConfiguracao()
Log = logging.getLogger("api.livros")


@asynccontextmanager
async def GerenciarCicloDeVida(aplicacao: FastAPI):
    aplicacao.state.ModeloRecomendacao = None
    try:
        modelo = RecomendacaoService.CarregarModelo(Configuracao.GetDiretorioArtefatosAbsoluto())
        aplicacao.state.ModeloRecomendacao = modelo
        if modelo is None:
            Log.warning("modelo tf-idf nao encontrado; rode Scripts/TreinarRecomendador.py")
        else:
            Log.info(
                "modelo carregado: %s livros, %s termos, treinado em %s",
                modelo.GetTotalDeLivros(),
                modelo.GetTotalDeTermos(),
                modelo.TreinadoEm,
            )
    except Exception:
        Log.exception("falha ao carregar o modelo de recomendacao")

    yield

    aplicacao.state.ModeloRecomendacao = None


Aplicacao = FastAPI(
    title="API de Recomendacao de Livros",
    description=(
        "Recomendacao baseada em conteudo (TF-IDF + similaridade de cosseno) "
        "sobre o catalogo de livros do PI6."
    ),
    version="0.1.0",
    lifespan=GerenciarCicloDeVida,
)

Aplicacao.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

Aplicacao.include_router(LivrosController.Roteador)
Aplicacao.include_router(RecomendacoesController.Roteador)
Aplicacao.include_router(CategoriasController.Roteador)


@Aplicacao.get("/saude", tags=["Infra"])
def GetSaude():
    bancoOk = True
    try:
        with CriarSessao() as sessao:
            sessao.execute(text("SELECT 1"))
    except Exception:
        bancoOk = False

    modelo = Aplicacao.state.ModeloRecomendacao
    return {
        "banco": "ok" if bancoOk else "indisponivel",
        "modelo_carregado": modelo is not None,
        "livros_no_modelo": modelo.GetTotalDeLivros() if modelo else 0,
        "modelo_treinado_em": modelo.TreinadoEm if modelo else None,
    }
