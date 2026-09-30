from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, func, select, text
from sqlalchemy.orm import Session

from alembic import command
from app.api.pedidos import get_pedido_service
from app.core.config import Settings
from app.db.session import session_factory
from app.main import create_app
from app.models import Auditoria, Cliente, Pedido
from app.repositories.usuarios import UsuarioRepository
from app.services.credenciales import CredentialService
from app.services.pedidos import PedidoUnavailable

pytestmark = pytest.mark.integration
FRONTEND_ORIGIN = "http://127.0.0.1:5173"


def create_user(factory, email, role):
    with factory.begin() as session:
        CredentialService(UsuarioRepository(session)).create(
            email, "correct-password", role
        )


def create_client(factory):
    with factory.begin() as session:
        client = Cliente(nombre="Cliente de prueba")
        session.add(client)
        session.flush()
        return client.cliente_id


def login(client, email):
    response = client.post(
        "/login", json={"email": email, "password": "correct-password"}
    )
    assert response.status_code == 200
    assert client.cookies.get("ecologistica_session") is not None


def payload(client_id, **changes):
    data = {
        "cliente_id": str(client_id),
        "direccion": "Av. Principal 123, Lima Este",
        "latitud": -11.987654,
        "longitud": -76.987654,
        "peso_kg": "12.50",
        "volumen_m3": "0.080",
        "ventana_inicio": "2026-10-01T09:00:00-05:00",
        "ventana_fin": "2026-10-01T11:00:00-05:00",
        "prioridad": "ESTANDAR",
        "tipo_producto": "PRODUCTO_PRUEBA",
    }
    data.update(changes)
    return data


def count_orders(engine):
    with Session(engine) as session:
        return session.scalar(select(func.count()).select_from(Pedido))


def clear_audit(factory):
    # Existing audit downgrades protect evidence; this database is disposable.
    with factory.begin() as session:
        session.execute(delete(Auditoria))


def test_bdd_valid_order_and_nonstandard_example(migration_database):
    engine, config = migration_database
    command.upgrade(config, "head")
    factory = session_factory(engine)
    client_id = create_client(factory)
    create_user(factory, "operator-order@example.test", "OPERADOR")
    app = create_app(
        Settings(app_env="test", database_url=config.attributes["database_url"])
    )
    try:
        with TestClient(app) as client:
            login(client, "operator-order@example.test")
            valid = client.post("/pedidos", json=payload(client_id))
            assert valid.status_code == 201
            assert valid.json()["estado"] == "PENDIENTE"
            assert valid.json()["peso_kg"] == "12.50"
            assert count_orders(engine) == 1

            example = client.post(
                "/pedidos",
                json=payload(
                    client_id,
                    direccion="Mz. A Lt. 5, Lima Este",
                    referencia="Frente al parque del sector",
                ),
            )
            assert example.status_code == 201
            assert example.json()["estado"] == "PENDIENTE"
            assert example.json()["referencia"] == "Frente al parque del sector"
            assert count_orders(engine) == 2
            with Session(engine) as session:
                row = session.get(Pedido, example.json()["pedido_id"])
                assert row.direccion == "Mz. A Lt. 5, Lima Este"
                assert row.referencia == "Frente al parque del sector"
                assert row.estado == "PENDIENTE"
                assert row.peso_kg == Decimal("12.50")
                location = session.execute(
                    text(
                        """
                        SELECT ST_X(ubicacion::geometry), ST_Y(ubicacion::geometry)
                        FROM pedido WHERE pedido_id = :pedido_id
                        """
                    ),
                    {"pedido_id": row.pedido_id},
                ).one()
                assert location[0] == pytest.approx(-76.987654)
                assert location[1] == pytest.approx(-11.987654)
    finally:
        clear_audit(factory)


def test_bdd_invalid_windows_are_actionable_and_not_persisted(migration_database):
    engine, config = migration_database
    command.upgrade(config, "head")
    factory = session_factory(engine)
    client_id = create_client(factory)
    create_user(factory, "operator-window@example.test", "OPERADOR")
    app = create_app(
        Settings(app_env="test", database_url=config.attributes["database_url"])
    )
    try:
        with TestClient(app) as client:
            login(client, "operator-window@example.test")
            for final_time in (
                "2026-10-01T08:00:00-05:00",
                "2026-10-01T09:00:00-05:00",
            ):
                rejected = client.post(
                    "/pedidos", json=payload(client_id, ventana_fin=final_time)
                )
                assert rejected.status_code == 422
                assert "ventana_fin" in rejected.text
                assert count_orders(engine) == 0
    finally:
        clear_audit(factory)


def test_real_auth_rbac_client_errors_and_sanitized_storage(migration_database):
    engine, config = migration_database
    command.upgrade(config, "head")
    factory = session_factory(engine)
    client_id = create_client(factory)
    create_user(factory, "admin-order@example.test", "ADMINISTRADOR")
    create_user(factory, "auditor-order@example.test", "AUDITOR")
    app = create_app(
        Settings(app_env="test", database_url=config.attributes["database_url"])
    )
    try:
        with TestClient(app) as client:
            assert client.post("/pedidos", json=payload(client_id)).status_code == 401
            login(client, "auditor-order@example.test")
            assert client.post("/pedidos", json=payload(client_id)).status_code == 403
            login(client, "admin-order@example.test")
            assert client.post("/pedidos", json=payload(uuid4())).status_code == 404
            created = client.post("/pedidos", json=payload(client_id))
            assert created.status_code == 201

            class UnavailableService:
                def create(self, request):
                    raise PedidoUnavailable("private SQL")

            app.dependency_overrides[get_pedido_service] = lambda: UnavailableService()
            unavailable = client.post("/pedidos", json=payload(client_id))
            assert unavailable.status_code == 503
            assert "private SQL" not in unavailable.text
            assert count_orders(engine) == 1
    finally:
        clear_audit(factory)


def test_credentialed_browser_login_and_order_creation(migration_database):
    engine, config = migration_database
    command.upgrade(config, "head")
    factory = session_factory(engine)
    client_id = create_client(factory)
    create_user(factory, "operator-cors@example.test", "OPERADOR")
    app = create_app(
        Settings(
            app_env="test",
            database_url=config.attributes["database_url"],
            cors_allowed_origins=[FRONTEND_ORIGIN],
        )
    )
    try:
        with TestClient(app) as client:
            with Session(engine) as session:
                audits_before = session.scalar(
                    select(func.count()).select_from(Auditoria)
                )
            preflight = client.options(
                "/pedidos",
                headers={
                    "Origin": FRONTEND_ORIGIN,
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "content-type",
                },
            )
            assert preflight.status_code == 200
            assert preflight.headers["access-control-allow-origin"] == FRONTEND_ORIGIN
            with Session(engine) as session:
                assert (
                    session.scalar(select(func.count()).select_from(Auditoria))
                    == audits_before
                )
            assert count_orders(engine) == 0

            unauthorized = client.post(
                "/pedidos",
                json=payload(client_id),
                headers={"Origin": FRONTEND_ORIGIN},
            )
            assert unauthorized.status_code == 401
            assert count_orders(engine) == 0

            login_response = client.post(
                "/login",
                json={
                    "email": "operator-cors@example.test",
                    "password": "correct-password",
                },
                headers={"Origin": FRONTEND_ORIGIN},
            )
            assert login_response.status_code == 200
            assert "HttpOnly" in login_response.headers["set-cookie"]
            assert (
                login_response.headers["access-control-allow-origin"] == FRONTEND_ORIGIN
            )
            assert login_response.headers["access-control-allow-credentials"] == "true"
            assert client.cookies.get("ecologistica_session") is not None

            created = client.post(
                "/pedidos",
                json=payload(client_id),
                headers={"Origin": FRONTEND_ORIGIN},
            )
            assert created.status_code == 201
            assert created.headers["access-control-allow-origin"] == FRONTEND_ORIGIN
            assert created.headers["access-control-allow-credentials"] == "true"
            assert count_orders(engine) == 1
    finally:
        clear_audit(factory)
