from app.Schemas.BaseSchema import BaseSchema


class LivroResumoSchema(BaseSchema):
    IdLivro: int
    Titulo: str
    Autores: str | None = None
    Categoria: str | None = None
    AnoPublicacao: int | None = None
    MesPublicacao: str | None = None
    ImagemCapa: str | None = None
    PrecoInicial: float | None = None


class LivroDetalheSchema(LivroResumoSchema):
    Isbn: str | None = None
    Descricao: str | None = None
    Editora: str | None = None
    AvaliacaoMedia: float | None = None
