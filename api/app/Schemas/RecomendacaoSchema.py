from app.Schemas.BaseSchema import BaseSchema
from app.Schemas.LivroSchema import LivroResumoSchema


class RecomendacaoSchema(BaseSchema):
    Livro: LivroResumoSchema
    Score: float
    Posicao: int


class RecomendacoesSchema(BaseSchema):
    IdLivro: int
    Origem: str
    Recomendacoes: list[RecomendacaoSchema]
