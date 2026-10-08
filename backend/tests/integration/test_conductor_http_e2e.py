"""ECL-50: real sessions, PostgreSQL persistence and rejected driver writes."""

from datetime import date, timedelta
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, func, select

from alembic import command
from app.core.config import Settings
from app.db.session import session_factory
from app.main import create_app
from app.models import Auditoria, Conductor
from app.repositories.usuarios import UsuarioRepository
from app.services.credenciales import CredentialService

pytestmark = pytest.mark.integration


def test_driver_real_sessions_persistence_and_rbac(migration_database):
    engine, config = migration_database
    command.upgrade(config, "head")
    factory = session_factory(engine)
    users = {}
    with factory.begin() as session:
        credentials = CredentialService(UsuarioRepository(session))
        for role in ("ADMINISTRADOR", "OPERADOR", "CONDUCTOR", "AUDITOR", "ANALISTA"):
            users[role] = credentials.create(
                f"{role.lower()}@example.test", "synthetic-test-password", role
            ).usuario_id
    app = create_app(
        Settings(app_env="test", database_url=config.attributes["database_url"])
    )
    payload = {
        "nombre": "DEMO Conductor sintético",
        "dni": "90000001",
        "licencia": "DEMO-LIC-01",
        "licencia_vigente_hasta": (date.today() + timedelta(days=365)).isoformat(),
        "experiencia_anios": 2,
        "telefono": "000000000",
        "disponible_desde": "2026-10-09T08:00:00-05:00",
        "disponible_hasta": "2026-10-09T16:00:00-05:00",
        "punto_partida": "DEMO Depósito sintético",
    }
    try:
        with TestClient(app) as client:

            def login(role):
                response = client.post(
                    "/login",
                    json={
                        "email": f"{role.lower()}@example.test",
                        "password": "synthetic-test-password",
                    },
                )
                assert response.status_code == 200

            assert client.post("/conductores", json=payload).status_code == 401
            login("OPERADOR")
            created = client.post("/conductores", json=payload)
            assert created.status_code == 201, created.text
            driver_id = created.json()["conductor_id"]
            assert created.json()["usuario_id"] is None
            assert client.post("/conductores", json=payload).status_code == 409
            expired = {
                **payload,
                "dni": "90000002",
                "licencia_vigente_hasta": "2000-01-01",
            }
            assert client.post("/conductores", json=expired).status_code == 422
            path = f"/conductores/{driver_id}"
            assert (
                client.patch(
                    path,
                    json={
                        "disponible_hasta": "2026-10-09T07:00:00-05:00",
                    },
                ).status_code
                == 422
            )
            changed = client.patch(
                path,
                json={
                    "disponible_hasta": "2026-10-09T17:00:00-05:00",
                    "usuario_id": str(users["CONDUCTOR"]),
                },
            )
            assert changed.status_code == 200
            # Invalid account changes must roll back, preserving the real owner.
            assert (
                client.patch(
                    path,
                    json={
                        "usuario_id": str(users["AUDITOR"]),
                    },
                ).status_code
                == 422
            )
            for role in ("AUDITOR", "ANALISTA", "CONDUCTOR"):
                login(role)
                assert client.get("/conductores").status_code == 403
                assert client.get(path).status_code == 403
                assert client.post("/conductores", json=payload).status_code == 403
                assert (
                    client.patch(path, json={"nombre": "No guardar"}).status_code == 403
                )
            own = client.get("/conductores/me")
            assert own.status_code == 200
            assert own.json()["conductor_id"] == driver_id
            login("ADMINISTRADOR")
            assert client.get(path).json()["nombre"] == payload["nombre"]
            assert client.get("/health/ready").status_code == 200
            metrics = client.get("/internal/metrics")
            assert metrics.status_code == 200
            assert metrics.json()["database"]["business"]["count"] > 0
            assert metrics.json()["database"]["audit"]["count"] > 0
            assert "90000001" not in metrics.text
            assert driver_id not in metrics.text
        with factory() as session:
            assert session.scalar(select(func.count()).select_from(Conductor)) == 1
            saved = session.get(Conductor, UUID(driver_id))
            assert saved.usuario_id == users["CONDUCTOR"]
            assert saved.nombre == payload["nombre"]
            assert saved.disponible_hasta.hour == 22  # PostgreSQL UTC
    finally:
        with factory.begin() as session:
            session.execute(delete(Auditoria))
