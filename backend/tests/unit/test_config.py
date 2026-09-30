import pytest
from pydantic import ValidationError
from pydantic_settings import SettingsError

from app.core.config import Settings


def test_defaults_and_blank_url():
    assert Settings().database_url is None
    assert Settings(database_url="").database_url is None
    assert Settings().db_connect_timeout == 5
    assert Settings().session_ttl_minutes == 60
    assert Settings().cors_allowed_origins == []


def test_cors_origins_from_json_environment(monkeypatch):
    monkeypatch.setenv(
        "CORS_ALLOWED_ORIGINS",
        '["http://127.0.0.1:5173", "https://frontend.example.test/"]',
    )
    assert Settings().cors_allowed_origins == [
        "http://127.0.0.1:5173",
        "https://frontend.example.test",
    ]


@pytest.mark.parametrize(
    "origins",
    [
        ["http://127.0.0.1:5173", "http://127.0.0.1:5173/"],
        ["*"],
        ["https://*.example.test"],
        ["ftp://frontend.example.test"],
        ["https://user:password@frontend.example.test"],
        ["https://frontend.example.test/app"],
        ["https://frontend.example.test?query=1"],
        ["https://frontend.example.test#section"],
    ],
)
def test_invalid_cors_origins_are_rejected(origins):
    with pytest.raises(ValidationError):
        Settings(cors_allowed_origins=origins)


def test_cors_environment_requires_json(monkeypatch):
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "http://127.0.0.1:5173")
    with pytest.raises(SettingsError):
        Settings()


def test_production_rejects_http_cors_origin():
    with pytest.raises(ValidationError):
        Settings(
            app_env="production",
            cors_allowed_origins=["http://127.0.0.1:5173"],
        )


def test_production_accepts_https_cors_origin():
    settings = Settings(
        app_env="production",
        cors_allowed_origins=["https://frontend.example.test"],
    )
    assert settings.cors_allowed_origins == ["https://frontend.example.test"]


@pytest.mark.parametrize("url", ["broken", "sqlite:///db", "postgresql://host/db"])
def test_invalid_urls(url):
    with pytest.raises(ValidationError):
        Settings(database_url=url)


def test_environment_overrides_dotenv(monkeypatch, tmp_path):
    (tmp_path / ".env").write_text("APP_ENV=development\n", encoding="utf-8")
    monkeypatch.setenv("APP_ENV", "test")
    assert Settings().app_env == "test"


def test_secret_is_hidden():
    settings = Settings(database_url="postgresql+psycopg://user:private@localhost/db")
    assert "private" not in repr(settings)
    with pytest.raises(ValidationError) as error:
        Settings(database_url="sqlite://user:private@localhost/db")
    assert "private" not in str(error.value)


@pytest.mark.parametrize("timeout", [0, 31])
def test_bounded_timeout(timeout):
    with pytest.raises(ValidationError):
        Settings(db_connect_timeout=timeout)
