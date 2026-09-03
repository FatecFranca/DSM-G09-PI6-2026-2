from fastapi import APIRouter, HTTPException, Query, status

from app.Core.Configuracao import GetConfiguracao
from app.Core.Dependencias import PaginaDependencia, SessaoDependencia, TamanhoPaginaDependencia
from app.Schemas.LivroSchema import LivroDetalheSchema, LivroResumoSchema
from app.Schemas.PaginaSchema import PaginaSchema
from app.Services import LivrosService

Configuracao = GetConfiguracao()

Roteador = APIRouter(prefix="/livros", tags=["Livros"])


@Roteador.get("", response_model=PaginaSchema[LivroResumoSchema])
def GetLivros(
    sessao: SessaoDependencia,
    pagina: PaginaDependencia = 1,
    tamanhoPagina: TamanhoPaginaDependencia = Configuracao.TamanhoPaginaPadrao,
    categoria: str | None = Query(default=None, description="filtra por categoria"),
    busca: str | None = Query(default=None, description="busca por titulo ou autor"),
):
    livros, total = LivrosService.GetLivros(sessao, pagina, tamanhoPagina, categoria, busca)
    return PaginaSchema.Montar(
        itens=[LivroResumoSchema.model_validate(livro) for livro in livros],
        total=total,
        pagina=pagina,
        tamanhoPagina=tamanhoPagina,
    )


@Roteador.get("/{idLivro}", response_model=LivroDetalheSchema)
def GetLivroPorId(idLivro: int, sessao: SessaoDependencia):
    livro = LivrosService.GetLivroPorId(sessao, idLivro)
    if livro is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"livro {idLivro} nao encontrado"
        )
    return livro
