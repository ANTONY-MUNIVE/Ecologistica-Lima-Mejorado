"""Client delivery preference contracts."""

from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class PreferenciasUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    horario_preferido: str | None = Field(default=None, max_length=120)
    referencia: str | None = Field(default=None, max_length=255)
    restriccion_acceso: str | None = Field(default=None, max_length=255)

    @model_validator(mode="before")
    @classmethod
    def nonempty_patch(cls, value: Any) -> Any:
        if isinstance(value, dict) and not value:
            raise ValueError("Se requiere al menos una preferencia")
        return value

    @field_validator(
        "horario_preferido", "referencia", "restriccion_acceso", mode="before"
    )
    @classmethod
    def trim_nonblank(cls, value: Any) -> Any:
        if isinstance(value, str):
            value = value.strip()
            if not value:
                raise ValueError("La preferencia no puede estar vacía")
        return value


class PreferenciasResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    cliente_id: UUID
    horario_preferido: str | None
    referencia: str | None
    restriccion_acceso: str | None
