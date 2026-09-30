"""Environment configuration; database credentials are never logged."""

from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, SecretStr, ValidationInfo, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        hide_input_in_errors=True,
    )

    app_env: Literal["development", "test", "production"] = "development"
    database_url: SecretStr | None = None
    db_connect_timeout: int = Field(default=5, ge=1, le=30)
    session_ttl_minutes: int = Field(default=60, ge=1, le=1440)
    cors_allowed_origins: list[str] = Field(default_factory=list)

    @field_validator("cors_allowed_origins")
    @classmethod
    def validate_cors_allowed_origins(
        cls, origins: list[str], info: ValidationInfo
    ) -> list[str]:
        normalized: list[str] = []
        for origin in origins:
            try:
                parsed = urlsplit(origin)
                hostname = parsed.hostname
                parsed.port  # Validate the port even when it is not used below.
            except ValueError:
                raise ValueError("Invalid CORS origin") from None

            exact_origin = f"{parsed.scheme}://{parsed.netloc}"
            if (
                parsed.scheme not in {"http", "https"}
                or not hostname
                or parsed.username is not None
                or parsed.password is not None
                or "*" in origin
                or any(character.isspace() for character in origin)
                or origin not in {exact_origin, f"{exact_origin}/"}
            ):
                raise ValueError("Invalid CORS origin")
            if info.data.get("app_env") == "production" and parsed.scheme != "https":
                raise ValueError("Production CORS origins must use HTTPS")
            if exact_origin in normalized:
                raise ValueError("Duplicate CORS origin")
            normalized.append(exact_origin)
        return normalized

    @field_validator("database_url", mode="before")
    @classmethod
    def empty_url(cls, value: object) -> object:
        return None if value == "" else value

    @field_validator("database_url")
    @classmethod
    def validate_url(cls, value: SecretStr | None) -> SecretStr | None:
        if value is None:
            return value
        try:
            url = make_url(value.get_secret_value())
        except ArgumentError:
            raise ValueError("Invalid database URL") from None
        if url.drivername != "postgresql+psycopg" or not url.host or not url.database:
            raise ValueError("Use postgresql+psycopg with host and database")
        return value
