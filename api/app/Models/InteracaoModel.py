from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Identity,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.Core.BancoDados import Base

TiposDeInteracao = ("visualizacao", "salvou", "removeu_salvo")


class Interacao(Base):
    __tablename__ = "interacoes"
    __table_args__ = (
        CheckConstraint(
            "tipo_interacao IN ('visualizacao', 'salvou', 'removeu_salvo')",
            name="chk_tipo_interacao",
        ),
    )

    IdInteracao: Mapped[int] = mapped_column(
        "id_interacao", BigInteger, Identity(always=True), primary_key=True
    )
    IdUsuario: Mapped[int] = mapped_column(
        "id_usuario",
        BigInteger,
        ForeignKey("usuarios.id_usuario", ondelete="CASCADE", name="fk_interacao_usuario"),
        nullable=False,
    )
    IdLivro: Mapped[int] = mapped_column(
        "id_livro",
        BigInteger,
        ForeignKey("livros.id_livro", ondelete="CASCADE", name="fk_interacao_livro"),
        nullable=False,
    )
    TipoInteracao: Mapped[str] = mapped_column("tipo_interacao", String(50), nullable=False)
    DataInteracao: Mapped[datetime] = mapped_column(
        "data_interacao",
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        nullable=False,
    )

    Usuario: Mapped["Usuario"] = relationship(back_populates="Interacoes")
    Livro: Mapped["Livro"] = relationship(back_populates="Interacoes")
