from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from app.Models.LivroModel import Livro


def _AplicarFiltros(consulta: Select, categoria: str | None, busca: str | None) -> Select:
    if categoria:
        consulta = consulta.where(Livro.Categoria.ilike(f"%{categoria.strip()}%"))
    if busca:
        termo = f"%{busca.strip()}%"
        consulta = consulta.where(
            or_(Livro.Titulo.ilike(termo), Livro.Autores.ilike(termo))
        )
    return consulta


def GetLivros(
    sessao: Session,
    pagina: int = 1,
    tamanhoPagina: int = 20,
    categoria: str | None = None,
    busca: str | None = None,
) -> tuple[list[Livro], int]:
    filtrada = _AplicarFiltros(select(Livro), categoria, busca)

    total = sessao.scalar(select(func.count()).select_from(filtrada.subquery())) or 0
    if total == 0:
        return [], 0

    itens = sessao.scalars(
        filtrada.order_by(Livro.Titulo, Livro.IdLivro)
        .offset((pagina - 1) * tamanhoPagina)
        .limit(tamanhoPagina)
    ).all()

    return list(itens), total


def GetLivroPorId(sessao: Session, idLivro: int) -> Livro | None:
    return sessao.get(Livro, idLivro)


def GetLivrosPorIds(sessao: Session, ids: list[int]) -> dict[int, Livro]:
    if not ids:
        return {}
    livros = sessao.scalars(select(Livro).where(Livro.IdLivro.in_(ids))).all()
    return {livro.IdLivro: livro for livro in livros}


def GetTotalDeLivros(sessao: Session) -> int:
    return sessao.scalar(select(func.count()).select_from(Livro)) or 0
