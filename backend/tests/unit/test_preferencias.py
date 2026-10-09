"""Preference persistence, validation and permission boundaries."""

from unittest.mock import Mock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.api.dependencies import get_authenticated_session, get_authentication_service
from app.api.preferencias import get_preference_service
from app.core.config import Settings
from app.core.rbac import Identidad, Rol
from app.main import create_app
from app.models.cliente import Cliente
from app.schemas.preferencias import PreferenciasUpdate
from app.services.autenticacion import AuthenticatedSession
from app.services.autorizacion import AutorizacionService
from app.services.preferencias import ClienteNoEncontrado, PreferenciasService


def test_preferences_persist_on_existing_client_and_can_be_cleared():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Cliente.__table__.create(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    client_id = uuid4()
    with factory.begin() as session:
        session.add(Cliente(cliente_id=client_id, nombre="Cliente sintético"))

    service = PreferenciasService(factory)
    saved = service.update(
        client_id,
        PreferenciasUpdate(
            horario_preferido=" 08:00 a 10:00 ",
            referencia=" Portón de prueba ",
            restriccion_acceso=" Consultar antes ",
        ),
    )
    assert saved.horario_preferido == "08:00 a 10:00"
    assert saved.referencia == "Portón de prueba"
    assert saved.restriccion_acceso == "Consultar antes"

    service.update(client_id, PreferenciasUpdate(referencia=None))
    with Session(engine) as session:
        stored = session.get(Cliente, client_id)
        assert stored is not None
        assert stored.horario_preferido == "08:00 a 10:00"
        assert stored.referencia is None
        assert stored.restriccion_acceso == "Consultar antes"
    with pytest.raises(ClienteNoEncontrado):
        service.get(uuid4())
    with pytest.raises(ClienteNoEncontrado):
        service.update(uuid4(), PreferenciasUpdate(referencia="Prueba"))
    engine.dispose()


def client_for(role=Rol.OPERADOR):
    app = create_app(Settings(database_url=None))
    identity = Identidad(uuid4(), role, "ACTIVO")
    service = Mock()
    app.dependency_overrides[get_authenticated_session] = lambda: AuthenticatedSession(
        uuid4(), identity
    )
    app.dependency_overrides[get_preference_service] = lambda: service
    with TestClient(app) as client:
        app.state.authorization_service = AutorizacionService(Mock())
        yield client, service


def test_operator_can_retrieve_and_update_only_existing_client():
    row = Cliente(
        cliente_id=uuid4(), nombre="Cliente sintético", horario_preferido="Mañana"
    )
    for client, service in client_for():
        service.get.return_value = row
        service.update.return_value = row
        path = f"/clientes/{row.cliente_id}/preferencias"
        assert client.get(path).json()["horario_preferido"] == "Mañana"
        assert client.patch(path, json={"referencia": " Portón "}).status_code == 200
        assert service.update.call_args.args[1].referencia == "Portón"
        service.get.side_effect = ClienteNoEncontrado()
        assert client.get(path).status_code == 404


@pytest.mark.parametrize("role", [Rol.CONDUCTOR, Rol.ANALISTA, Rol.AUDITOR])
def test_non_operational_roles_cannot_view_or_edit_preferences(role):
    for client, service in client_for(role):
        path = f"/clientes/{uuid4()}/preferencias"
        assert client.get(path).status_code == 403
        assert client.patch(path, json={"referencia": "Prueba"}).status_code == 403
        service.get.assert_not_called()
        service.update.assert_not_called()


@pytest.mark.parametrize(
    "change", [{}, {"horario_preferido": "   "}, {"referencia": "x" * 256}]
)
def test_invalid_preference_does_not_reach_service(change):
    for client, service in client_for():
        assert (
            client.patch(f"/clientes/{uuid4()}/preferencias", json=change).status_code
            == 422
        )
        service.update.assert_not_called()


def test_anonymous_preference_read_is_denied():
    app = create_app(Settings(database_url=None))
    app.dependency_overrides[get_preference_service] = lambda: Mock()
    app.dependency_overrides[get_authentication_service] = lambda: Mock()
    with TestClient(app) as client:
        assert client.get(f"/clientes/{uuid4()}/preferencias").status_code == 401


@pytest.mark.parametrize(
    "change",
    [
        {"referencia": "PRIVATE-REFERENCE" * 30},
        {"PRIVATE-PROPERTY": "PRIVATE-VALUE"},
    ],
)
def test_invalid_preference_response_does_not_echo_data(change):
    for client, service in client_for():
        response = client.patch(f"/clientes/{uuid4()}/preferencias", json=change)
        assert response.status_code == 422
        assert "PRIVATE-" not in response.text
        assert all(
            set(item) == {"type", "loc", "msg"} for item in response.json()["detail"]
        )
        service.update.assert_not_called()
