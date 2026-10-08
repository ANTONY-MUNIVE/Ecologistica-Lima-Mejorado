"""Validated driver API contracts."""

from datetime import date, datetime
from typing import Any
from uuid import UUID
from zoneinfo import ZoneInfo

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class _DriverInput(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    @field_validator(
        "nombre",
        "licencia",
        "telefono",
        "punto_partida",
        mode="before",
        check_fields=False,
    )
    @classmethod
    def strip_required_text(cls, value: Any) -> Any:
        return value.strip() if isinstance(value, str) else value

    @field_validator("disponible_desde", "disponible_hasta", check_fields=False)
    @classmethod
    def require_timezone(cls, value: datetime | None) -> datetime | None:
        if value is not None and value.utcoffset() is None:
            raise ValueError("La fecha y hora debe incluir zona horaria")
        return value

    @field_validator("licencia_vigente_hasta", check_fields=False)
    @classmethod
    def require_current_license(cls, value: date | None) -> date | None:
        if value is not None and value < datetime.now(ZoneInfo("America/Lima")).date():
            raise ValueError("La licencia está vencida")
        return value


class DriverCreate(_DriverInput):
    usuario_id: UUID | None = None
    nombre: str = Field(min_length=1, max_length=160)
    dni: str = Field(min_length=8, max_length=8, pattern=r"^[0-9]{8}$")
    licencia: str = Field(min_length=1, max_length=40)
    licencia_vigente_hasta: date
    experiencia_anios: int = Field(ge=0, le=32767)
    telefono: str = Field(min_length=1, max_length=30)
    disponible_desde: datetime
    disponible_hasta: datetime
    punto_partida: str = Field(min_length=1, max_length=255)

    @model_validator(mode="after")
    def require_valid_window(self) -> "DriverCreate":
        if self.disponible_desde >= self.disponible_hasta:
            raise ValueError("La disponibilidad debe terminar después de su inicio")
        return self


class DriverUpdate(_DriverInput):
    usuario_id: UUID | None = None
    nombre: str | None = Field(default=None, min_length=1, max_length=160)
    dni: str | None = Field(
        default=None, min_length=8, max_length=8, pattern=r"^[0-9]{8}$"
    )
    licencia: str | None = Field(default=None, min_length=1, max_length=40)
    licencia_vigente_hasta: date | None = None
    experiencia_anios: int | None = Field(default=None, ge=0, le=32767)
    telefono: str | None = Field(default=None, min_length=1, max_length=30)
    disponible_desde: datetime | None = None
    disponible_hasta: datetime | None = None
    punto_partida: str | None = Field(default=None, min_length=1, max_length=255)

    @model_validator(mode="before")
    @classmethod
    def reject_empty_or_null(cls, value: Any) -> Any:
        if isinstance(value, dict) and (
            not value or any(v is None for v in value.values())
        ):
            raise ValueError("Se requiere al menos un campo no nulo")
        return value

    @model_validator(mode="after")
    def require_valid_window(self) -> "DriverUpdate":
        if self.disponible_desde and self.disponible_hasta:
            if self.disponible_desde >= self.disponible_hasta:
                raise ValueError("La disponibilidad debe terminar después de su inicio")
        return self


class DriverResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    conductor_id: UUID
    usuario_id: UUID | None
    nombre: str
    dni: str
    licencia: str
    licencia_vigente_hasta: date
    experiencia_anios: int
    telefono: str
    disponible_desde: datetime
    disponible_hasta: datetime
    punto_partida: str
