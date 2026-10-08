"""Driver master data for assignment eligibility and availability."""

from datetime import date, datetime
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    SmallInteger,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Conductor(Base):
    __tablename__ = "conductor"
    __table_args__ = (
        UniqueConstraint("dni", name="uq_conductor_dni"),
        UniqueConstraint("usuario_id", name="uq_conductor_usuario_id"),
        CheckConstraint("dni ~ '^[0-9]{8}$'", name="ck_conductor_dni"),
        CheckConstraint("nombre ~ '[^[:space:]]'", name="ck_conductor_nombre"),
        CheckConstraint("licencia ~ '[^[:space:]]'", name="ck_conductor_licencia"),
        CheckConstraint("telefono ~ '[^[:space:]]'", name="ck_conductor_telefono"),
        CheckConstraint(
            "punto_partida ~ '[^[:space:]]'", name="ck_conductor_punto_partida"
        ),
        CheckConstraint("experiencia_anios >= 0", name="ck_conductor_experiencia"),
        CheckConstraint(
            "disponible_desde < disponible_hasta", name="ck_conductor_disponibilidad"
        ),
    )

    conductor_id: Mapped[UUID] = mapped_column(
        primary_key=True, server_default=text("gen_random_uuid()")
    )
    usuario_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("usuario.usuario_id", name="fk_conductor_usuario")
    )
    nombre: Mapped[str] = mapped_column(String(160))
    dni: Mapped[str] = mapped_column(String(8))
    licencia: Mapped[str] = mapped_column(String(40))
    licencia_vigente_hasta: Mapped[date] = mapped_column(Date())
    experiencia_anios: Mapped[int] = mapped_column(SmallInteger)
    telefono: Mapped[str] = mapped_column(String(30))
    disponible_desde: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    disponible_hasta: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    punto_partida: Mapped[str] = mapped_column(String(255))

    def __repr__(self) -> str:
        return "<Conductor>"
