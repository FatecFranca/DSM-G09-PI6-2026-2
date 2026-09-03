from fastapi import APIRouter, Query

from app.Core.Dependencias import SessaoDependencia
from app.Schemas.CategoriaSchema import CategoriaSchema
from app.Services import CategoriasService

Roteador = APIRouter(prefix="/categorias", tags=["Categorias"])


@Roteador.get("", response_model=list[CategoriaSchema])
def GetCategorias(
        sessao: SessaoDependencia,
        minimoDeLivros: int = Query(default=1, ge=1, description="ignora categorias raras"),
        limite: int = Query(default=500, ge=1, le=5_000),
    ):
        categorias = CategoriasService.GetCategorias(sessao, minimoDeLivros, limite)
        return [
            CategoriaSchema(Categoria=categoria, TotalLivros=total) for categoria, total in categorias
        ]
