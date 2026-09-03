from fastapi import APIRouter, HTTPException, Query, status

from app.Core.Configuracao import GetConfiguracao
from app.Core.Dependencias import ModeloDependencia, SessaoDependencia
from app.Schemas.LivroSchema import LivroResumoSchema
from app.Schemas.RecomendacaoSchema import RecomendacaoSchema, RecomendacoesSchema
from app.Services import LivrosService, RecomendacaoService

Configuracao = GetConfiguracao()

Roteador = APIRouter(prefix="/livros", tags=["Recomendacoes"])


@Roteador.get("/{idLivro}/recomendacoes", response_model=RecomendacoesSchema)
def GetRecomendacoes(
        idLivro: int,
        sessao: SessaoDependencia,
        modelo: ModeloDependencia,
        total: int = Query(
            default=Configuracao.TotalRecomendacoes, ge=1, le=50, description="quantidade de similares"
        ),
    ):

    livro = LivrosService.GetLivroPorId(sessao, idLivro)
    if livro is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"livro {idLivro} nao encontrado"
            )

    origem, similares = RecomendacaoService.GetRecomendacoes(sessao, livro, modelo, total)
    livrosPorId = LivrosService.GetLivrosPorIds(sessao, [idSimilar for idSimilar, _ in similares])

    recomendacoes = []
    for posicao, (idSimilar, score) in enumerate(similares, start=1):
        livroSimilar = livrosPorId.get(idSimilar)
        if livroSimilar is None:
            continue
        recomendacoes.append(
            RecomendacaoSchema(
                Livro=LivroResumoSchema.model_validate(livroSimilar),
                Score=round(score, 6),
                Posicao=posicao,
            )
        )

    return RecomendacoesSchema(IdLivro=idLivro, Origem=origem, Recomendacoes=recomendacoes)
