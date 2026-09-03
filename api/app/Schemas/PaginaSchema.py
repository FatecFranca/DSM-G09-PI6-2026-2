from typing import Generic, TypeVar

from app.Schemas.BaseSchema import BaseSchema

TipoItem = TypeVar("TipoItem")


class PaginaSchema(BaseSchema, Generic[TipoItem]):
    Itens: list[TipoItem]
    Total: int
    Pagina: int
    TamanhoPagina: int
    TotalPaginas: int

    @staticmethod
    def Montar(itens: list, total: int, pagina: int, tamanhoPagina: int) -> "PaginaSchema":
        totalPaginas = (total + tamanhoPagina - 1) // tamanhoPagina if tamanhoPagina else 0
        return PaginaSchema(
            Itens=itens,
            Total=total,
            Pagina=pagina,
            TamanhoPagina=tamanhoPagina,
            TotalPaginas=totalPaginas,
        )
