"""Guard the demo tool against production, remote targets and existing data."""

from unittest.mock import MagicMock

import pytest

from app.core.config import Settings
from app.seed_sprint2 import seed


@pytest.mark.parametrize(
    "url,environment,password",
    [
        (None, "development", "synthetic-long-password"),
        (
            "postgresql+psycopg://localhost/ecl_sprint2_dev",
            "production",
            "synthetic-long-password",
        ),
        (
            "postgresql+psycopg://localhost/another_db",
            "development",
            "synthetic-long-password",
        ),
        (
            "postgresql+psycopg://remote.invalid/ecl_sprint2_dev",
            "development",
            "synthetic-long-password",
        ),
        ("postgresql+psycopg://localhost/ecl_sprint2_dev", "development", "short"),
    ],
)
def test_rejects_unsafe_target_before_connecting(
    monkeypatch, url, environment, password
):
    connect = MagicMock()
    monkeypatch.setattr("app.seed_sprint2.build_engine", connect)
    with pytest.raises(ValueError):
        seed(Settings(database_url=url, app_env=environment), password)
    connect.assert_not_called()


@pytest.mark.parametrize("occupied", [True, False])
def test_seed_never_overwrites_and_disposes_engine(monkeypatch, occupied):
    engine = MagicMock()
    factory = MagicMock()
    session = factory.begin.return_value.__enter__.return_value
    session.scalar.return_value = object() if occupied else None
    credentials = MagicMock()
    monkeypatch.setattr("app.seed_sprint2.build_engine", lambda settings: engine)
    monkeypatch.setattr("app.seed_sprint2.session_factory", lambda target: factory)
    monkeypatch.setattr(
        "app.seed_sprint2.CredentialService", lambda repository: credentials
    )
    settings = Settings(database_url="postgresql+psycopg://localhost/ecl_sprint2_dev")
    if occupied:
        with pytest.raises(ValueError, match="ya contiene datos"):
            seed(settings, "synthetic-long-password")
        credentials.create.assert_not_called()
        session.add.assert_not_called()
    else:
        seed(settings, "synthetic-long-password")
        assert credentials.create.call_count == 4
        assert session.add.call_count == 2
    engine.dispose.assert_called_once()
