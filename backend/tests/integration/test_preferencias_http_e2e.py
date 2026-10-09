"""ECL-54: preferences persisted in Cliente and reused by explicit order input."""

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from alembic import command
from app.core.config import Settings
from app.db.session import session_factory
from app.main import create_app
from app.models import Auditoria, Cliente, Pedido
from app.repositories.usuarios import UsuarioRepository
from app.services.credenciales import CredentialService

pytestmark = pytest.mark.integration


def test_preferences_persist_and_support_order_without_implicit_window(
    migration_database,
):
    engine, config = migration_database
    command.upgrade(config, "head")
    factory = session_factory(engine)
    with factory.begin() as session:
        customer = Cliente(nombre="DEMO Cliente sintético")
        session.add(customer)
        session.flush()
        customer_id = customer.cliente_id
        other = Cliente(
            nombre="DEMO Otro cliente sintético",
            horario_preferido="Tarde",
            referencia="DEMO Referencia de otro cliente",
            restriccion_acceso="DEMO Avisar al llegar",
        )
        session.add(other)
        session.flush()
        other_id = other.cliente_id
        for role in ("OPERADOR", "CONDUCTOR", "AUDITOR"):
            CredentialService(UsuarioRepository(session)).create(
                f"{role.lower()}@example.test", "synthetic-test-password", role
            )
    app = create_app(
        Settings(app_env="test", database_url=config.attributes["database_url"])
    )
    path = f"/clientes/{customer_id}/preferencias"
    preferences = {
        "horario_preferido": "Mañana (confirmar con cliente)",
        "referencia": "DEMO Portón azul sintético",
        "restriccion_acceso": "DEMO Avisar antes de ingresar",
    }
    try:
        with TestClient(app) as client:
            assert client.get(path).status_code == 401
            for role in ("CONDUCTOR", "AUDITOR", "OPERADOR"):
                assert (
                    client.post(
                        "/login",
                        json={
                            "email": f"{role.lower()}@example.test",
                            "password": "synthetic-test-password",
                        },
                    ).status_code
                    == 200
                )
                if role != "OPERADOR":
                    assert client.get(path).status_code == 403
                    assert client.patch(path, json=preferences).status_code == 403
            assert client.get(path).json()["referencia"] is None
            assert client.patch(path, json=preferences).status_code == 200
            assert client.patch(path, json={"referencia": "  "}).status_code == 422
            assert (
                client.patch(
                    path,
                    json={
                        "horario_preferido": "x" * 121,
                        "referencia": "No debe persistir parcialmente",
                    },
                ).status_code
                == 422
            )
            assert (
                client.patch(
                    f"/clientes/{uuid4()}/preferencias", json=preferences
                ).status_code
                == 404
            )
            retrieved = client.get(path).json()
            assert all(retrieved[key] == value for key, value in preferences.items())
            other_response = client.get(f"/clientes/{other_id}/preferencias")
            assert other_response.status_code == 200
            assert other_response.json() == {
                "cliente_id": str(other_id),
                "horario_preferido": "Tarde",
                "referencia": "DEMO Referencia de otro cliente",
                "restriccion_acceso": "DEMO Avisar al llegar",
            }
            order = client.post(
                "/pedidos",
                json={
                    "cliente_id": str(customer_id),
                    "direccion": "DEMO Av. Sintética 123, Lima Este",
                    "latitud": -11.987654,
                    "longitud": -76.987654,
                    "peso_kg": "12.50",
                    "volumen_m3": "0.080",
                    "ventana_inicio": "2026-10-09T09:00:00-05:00",
                    "ventana_fin": "2026-10-09T11:00:00-05:00",
                    "prioridad": "ESTANDAR",
                    "tipo_producto": "DEMO",
                    "referencia": retrieved["referencia"],
                },
            )
            assert order.status_code == 201, order.text
            assert client.patch(path, json={"referencia": None}).status_code == 200
        with factory() as session:
            stored = session.get(Cliente, customer_id)
            assert stored.referencia is None
            assert stored.horario_preferido == preferences["horario_preferido"]
            assert session.get(Cliente, other_id).referencia == (
                "DEMO Referencia de otro cliente"
            )
            saved_order = session.scalar(select(Pedido))
            assert saved_order.referencia == preferences["referencia"]
            assert saved_order.ventana_inicio.hour == 14
    finally:
        with factory.begin() as session:
            session.execute(delete(Auditoria))
