from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Identity, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.Core.BancoDados import Base


class LivroSalvo(Base):
    __tablename__ = "livros_salvos"
    __table_args__ = (UniqueConstraint("id_usuario", "id_livro", name="uq_usuario_livro_salvo"),)

    IdSalvo: Mapped[int] = mapped_column(
        "id_salvo", BigInteger, Identity(always=True), primary_key=True
    )
    IdUsuario: Mapped[int] = mapped_column(
        "id_usuario",
        BigInteger,
        ForeignKey("usuarios.id_usuario", ondelete="CASCADE", name="fk_salvo_usuario"),
        nullable=False,
    )
    IdLivro: Mapped[int] = mapped_column(
        "id_livro",
        BigInteger,
        ForeignKey("livros.id_livro", ondelete="CASCADE", name="fk_salvo_livro"),
        nullable=False,
    )
    DataSalvo: Mapped[datetime] = mapped_column(
        "data_salvo",
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        nullable=False,
    )

    Usuario: Mapped["Usuario"] = relationship(back_populates="LivrosSalvos")
    Livro: Mapped["Livro"] = relationship(back_populates="LivrosSalvos")
