"""Driver API contracts, RBAC, and safe validation errors."""

from datetime import date, datetime, timedelta, timezone
from unittest.mock import Mock
from uuid import uuid4
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient

from app.api.conductores import get_driver_service
from app.api.dependencies import get_authenticated_session, get_authentication_service
from app.core.config import Settings
from app.core.rbac import Identidad, Rol
from app.main import create_app
from app.models.conductor import Conductor
from app.services.autenticacion import AuthenticatedSession
from app.services.autorizacion import AutorizacionService
from app.services.conductores import (
    DriverDuplicate,
    DriverInvalid,
    DriverNotFound,
    DriverUnavailable,
)


def payload():
    start = datetime(2026, 10, 9, 13, tzinfo=timezone.utc)
    return {
        "nombre": " Conductor sintético ",
        "dni": "12345678",
        "licencia": " SYN-001 ",
        "licencia_vigente_hasta": (
            datetime.now(ZoneInfo("America/Lima")).date() + timedelta(days=30)
        ).isoformat(),
        "experiencia_anios": 2,
        "telefono": " 000000000 ",
        "disponible_desde": start.isoformat(),
        "disponible_hasta": (start + timedelta(hours=8)).isoformat(),
        "punto_partida": " Depósito de prueba ",
    }


def driver(user_id=None):
    values = payload()
    return Conductor(
        conductor_id=uuid4(),
        usuario_id=user_id,
        nombre="Conductor sintético",
        dni=values["dni"],
        licencia="SYN-001",
        licencia_vigente_hasta=date.fromisoformat(values["licencia_vigente_hasta"]),
        experiencia_anios=2,
        telefono="000000000",
        disponible_desde=datetime.fromisoformat(values["disponible_desde"]),
        disponible_hasta=datetime.fromisoformat(values["disponible_hasta"]),
        punto_partida="Depósito de prueba",
    )


def client_for(role=Rol.ADMINISTRADOR):
    app = create_app(Settings(database_url=None))
    identity = Identidad(uuid4(), role, "ACTIVO")
    service = Mock()
    audit = Mock()
    app.dependency_overrides[get_authenticated_session] = lambda: AuthenticatedSession(
        uuid4(), identity
    )
    app.dependency_overrides[get_driver_service] = lambda: service
    with TestClient(app) as client:
        app.state.authorization_service = AutorizacionService(audit)
        yield client, service, identity


def test_admin_can_create_list_get_and_update_with_normalized_input():
    for client, service, _identity in client_for():
        row = driver()
        service.create.return_value = row
        service.list_all.return_value = [row]
        service.get.return_value = row
        service.update.return_value = row
        assert client.post("/conductores", json=payload()).status_code == 201
        assert service.create.call_args.args[0].nombre == "Conductor sintético"
        assert client.get("/conductores").json()[0]["dni"] == "12345678"
        assert client.get(f"/conductores/{row.conductor_id}").status_code == 200
        assert (
            client.patch(
                f"/conductores/{row.conductor_id}", json={"experiencia_anios": 3}
            ).status_code
            == 200
        )


@pytest.mark.parametrize("role", [Rol.AUDITOR, Rol.ANALISTA, Rol.CONDUCTOR])
def test_non_operational_roles_cannot_read_personal_data_list(role):
    for client, service, _identity in client_for(role):
        assert client.get("/conductores").status_code == 403
        service.list_all.assert_not_called()


def test_driver_reads_only_own_record():
    for client, service, identity in client_for(Rol.CONDUCTOR):
        service.get_by_user.return_value = driver(identity.usuario_id)
        assert client.get("/conductores/me").status_code == 200
        service.get_by_user.assert_called_once_with(identity.usuario_id)
        assert client.get(f"/conductores/{uuid4()}").status_code == 403
        assert (
            client.patch(
                f"/conductores/{uuid4()}", json={"experiencia_anios": 3}
            ).status_code
            == 403
        )


@pytest.mark.parametrize(
    "change",
    [
        {"dni": "123"},
        {"dni": "12345678\n"},
        {"licencia_vigente_hasta": "2020-01-01"},
        {"disponible_hasta": "2026-10-09T13:00:00+00:00"},
        {"disponible_desde": "2026-10-09T13:00:00"},
    ],
)
def test_invalid_create_is_rejected_before_service(change):
    for client, service, _identity in client_for():
        assert (
            client.post("/conductores", json={**payload(), **change}).status_code == 422
        )
        service.create.assert_not_called()


@pytest.mark.parametrize(
    "error,status_code",
    [
        (DriverNotFound(), 404),
        (DriverDuplicate(), 409),
        (DriverInvalid("La licencia está vencida"), 422),
        (DriverUnavailable("private SQL"), 503),
    ],
)
def test_errors_are_sanitized(error, status_code):
    for client, service, _identity in client_for():
        service.update.side_effect = error
        response = client.patch(
            f"/conductores/{uuid4()}", json={"experiencia_anios": 3}
        )
        assert response.status_code == status_code
        assert "private SQL" not in response.text


def test_missing_session_is_401():
    app = create_app(Settings(database_url=None))
    app.dependency_overrides[get_driver_service] = lambda: Mock()
    app.dependency_overrides[get_authentication_service] = lambda: Mock()
    with TestClient(app) as client:
        assert client.get("/conductores").status_code == 401
