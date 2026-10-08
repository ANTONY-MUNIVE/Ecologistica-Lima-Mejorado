"""Operational counters, sanitized probes and metric permissions."""

from unittest.mock import Mock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

from app.api.dependencies import get_authenticated_session, get_authentication_service
from app.core.config import Settings
from app.core.rbac import Identidad, Rol
from app.main import create_app
from app.observability.metrics import MetricsRegistry, instrument_engine
from app.services.autenticacion import AuthenticatedSession
from app.services.autorizacion import AutorizacionService


def test_http_metrics_count_5xx_and_in_flight_without_raw_paths():
    registry = MetricsRegistry()
    first = registry.request_started()
    second = registry.request_started()
    assert registry.snapshot()["in_flight"] == 2
    registry.request_finished(first, "POST", "/pedidos", 201)
    registry.request_finished(second, "POST", "/pedidos", 503)
    snapshot = registry.snapshot()
    assert snapshot["in_flight"] == 0
    assert snapshot["peak_in_flight"] == 2
    assert snapshot["http"] == [
        {
            "method": "POST",
            "route": "/pedidos",
            "count": 2,
            "errors_5xx": 1,
            "errors": 0,
            "seconds_sum": snapshot["http"][0]["seconds_sum"],
            "seconds_max": snapshot["http"][0]["seconds_max"],
        }
    ]
    assert snapshot["http"][0]["seconds_sum"] >= 0


def test_database_hooks_count_success_and_error_without_sql_text():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    registry = MetricsRegistry()
    instrument_engine(engine, registry, "business")
    with engine.connect() as connection:
        assert connection.scalar(text("SELECT 1")) == 1
        with pytest.raises(SQLAlchemyError):
            connection.scalar(text("SELECT secret_column FROM missing_table"))
    snapshot = registry.snapshot()["database"]["business"]
    assert snapshot["count"] == 2
    assert snapshot["errors"] == 1
    assert "secret_column" not in str(registry.snapshot())
    engine.dispose()


def test_readiness_requires_database_but_returns_no_details():
    app = create_app(Settings(database_url=None))
    with TestClient(app) as client:
        assert client.get("/health").status_code == 200
        response = client.get("/health/ready")
        assert response.status_code == 503
        assert "database_url" not in response.text
        engine = create_engine("sqlite+pysqlite:///:memory:")
        app.state.engine = engine
        assert client.get("/health/ready").json() == {"status": "ok", "database": "ok"}
        engine.dispose()


def client_for(role: Rol):
    app = create_app(Settings(database_url=None))
    identity = Identidad(uuid4(), role, "ACTIVO")
    app.dependency_overrides[get_authenticated_session] = lambda: AuthenticatedSession(
        uuid4(), identity
    )
    with TestClient(app) as client:
        app.state.authorization_service = AutorizacionService(Mock())
        yield client


@pytest.mark.parametrize(
    "role,expected",
    [
        (Rol.ADMINISTRADOR, 200),
        (Rol.AUDITOR, 200),
        (Rol.OPERADOR, 403),
        (Rol.CONDUCTOR, 403),
    ],
)
def test_metrics_are_readable_only_with_general_audit_permission(role, expected):
    for client in client_for(role):
        response = client.get("/internal/metrics")
        assert response.status_code == expected
        if expected == 200:
            assert "database" in response.json()
            assert "in_flight" in response.json()


def test_anonymous_metrics_are_denied():
    app = create_app(Settings(database_url=None))
    app.dependency_overrides[get_authentication_service] = lambda: Mock()
    with TestClient(app) as client:
        assert client.get("/internal/metrics").status_code == 401
