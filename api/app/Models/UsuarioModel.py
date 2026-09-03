from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Identity, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.Core.BancoDados import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    IdUsuario: Mapped[int] = mapped_column(
        "id_usuario", BigInteger, Identity(always=True), primary_key=True
    )
    Nome: Mapped[str] = mapped_column("nome", String(150), nullable=False)
    Email: Mapped[str] = mapped_column("email", String(255), nullable=False, unique=True)
    SenhaHash: Mapped[str] = mapped_column("senha_hash", String(255), nullable=False)
    DataCadastro: Mapped[datetime] = mapped_column(
        "data_cadastro",
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        nullable=False,
    )

    LivrosSalvos: Mapped[list["LivroSalvo"]] = relationship(
        back_populates="Usuario", cascade="all, delete-orphan"
    )
    Interacoes: Mapped[list["Interacao"]] = relationship(
        back_populates="Usuario", cascade="all, delete-orphan"
    )
