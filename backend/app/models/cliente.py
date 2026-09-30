"""Documented client persistence needed by the order foreign key."""

from uuid import UUID

from sqlalchemy import String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Cliente(Base):
    __tablename__ = "cliente"

    cliente_id: Mapped[UUID] = mapped_column(
        primary_key=True, server_default=text("gen_random_uuid()")
    )
    nombre: Mapped[str] = mapped_column(String(160))
    horario_preferido: Mapped[str | None] = mapped_column(String(120))
    referencia: Mapped[str | None] = mapped_column(String(255))
    restriccion_acceso: Mapped[str | None] = mapped_column(String(255))

    def __repr__(self) -> str:
        return "<Cliente>"
