from sqlalchemy import BigInteger, Float, ForeignKey, Index, SmallInteger
from sqlalchemy.orm import Mapped, mapped_column

from app.Core.BancoDados import Base


class LivroSimilar(Base):
    # tabela nova, criada pela api: guarda o top-n de similaridade ja calculado
    __tablename__ = "livros_similares"
    __table_args__ = (Index("ix_livros_similares_livro", "id_livro", "posicao"),)

    IdLivro: Mapped[int] = mapped_column(
        "id_livro",
        BigInteger,
        ForeignKey("livros.id_livro", ondelete="CASCADE", name="fk_similar_livro"),
        primary_key=True,
    )
    Posicao: Mapped[int] = mapped_column("posicao", SmallInteger, primary_key=True)
    IdLivroSimilar: Mapped[int] = mapped_column(
        "id_livro_similar",
        BigInteger,
        ForeignKey("livros.id_livro", ondelete="CASCADE", name="fk_similar_livro_alvo"),
        nullable=False,
    )
    Score: Mapped[float] = mapped_column("score", Float, nullable=False)
