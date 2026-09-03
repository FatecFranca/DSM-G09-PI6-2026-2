from decimal import Decimal

from sqlalchemy import BigInteger, Identity, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.Core.BancoDados import Base

# colunas que alimentam o corpus do tf-idf
CamposDeConteudo = ("Titulo", "Categoria", "Autores", "Descricao")


class Livro(Base):
    __tablename__ = "livros"

    IdLivro: Mapped[int] = mapped_column(
        "id_livro", BigInteger, Identity(always=True), primary_key=True
    )
    Titulo: Mapped[str] = mapped_column("titulo", Text, nullable=False)
    Isbn: Mapped[str | None] = mapped_column("isbn", String(30))
    Descricao: Mapped[str | None] = mapped_column("descricao", Text)
    AnoPublicacao: Mapped[int | None] = mapped_column("ano_publicacao", Integer)
    ImagemCapa: Mapped[str | None] = mapped_column("imagem_capa", Text)
    Autores: Mapped[str | None] = mapped_column("autores", Text)
    Categoria: Mapped[str | None] = mapped_column("categoria", Text)
    AvaliacaoMedia: Mapped[Decimal | None] = mapped_column("avaliacao_media", Numeric(3, 2))
    Editora: Mapped[str | None] = mapped_column("editora", Text)
    PrecoInicial: Mapped[Decimal | None] = mapped_column("preco_inicial", Numeric(10, 2))
    MesPublicacao: Mapped[str | None] = mapped_column("mes_publicacao", String(30))

    LivrosSalvos: Mapped[list["LivroSalvo"]] = relationship(
        back_populates="Livro", cascade="all, delete-orphan"
    )
    Interacoes: Mapped[list["Interacao"]] = relationship(
        back_populates="Livro", cascade="all, delete-orphan"
    )

    def GetTextoDeConteudo(self) -> str:
        partes = [getattr(self, campo) or "" for campo in CamposDeConteudo]
        return " ".join(parte.strip() for parte in partes if parte.strip())
