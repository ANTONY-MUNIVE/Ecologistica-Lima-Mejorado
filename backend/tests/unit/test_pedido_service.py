from decimal import Decimal
from unittest.mock import MagicMock, Mock
from uuid import uuid4

import pytest
from sqlalchemy.exc import SQLAlchemyError

from app.repositories.clientes import ClienteStorageError
from app.repositories.pedidos import PedidoClienteMissing, PedidoStorageError
from app.schemas.pedido import PedidoCreate
from app.services import pedidos as module
from app.services.pedidos import (
    PedidoClienteNoEncontrado,
    PedidoService,
    PedidoUnavailable,
)


def payload(**changes):
    data = {
        "cliente_id": uuid4(),
        "direccion": "Av. Principal",
        "referencia": "Frente al parque",
        "peso_kg": Decimal("12.50"),
        "volumen_m3": Decimal("0.080"),
        "ventana_inicio": "2026-10-01T09:00:00-05:00",
        "ventana_fin": "2026-10-01T11:00:00-05:00",
        "prioridad": "ESTANDAR",
        "tipo_producto": "Libre",
    }
    data.update(changes)
    return PedidoCreate.model_validate(data)


def service_mocks(monkeypatch):
    factory = MagicMock()
    session = factory.begin.return_value.__enter__.return_value
    clients = Mock()
    orders = Mock()
    clients.exists.return_value = True
    orders.coordinates.return_value = (None, None)

    def generated(row, *_):
        row.pedido_id = uuid4()
        row.estado = "PENDIENTE"

    orders.add.side_effect = generated
    monkeypatch.setattr(module, "ClienteRepository", Mock(return_value=clients))
    monkeypatch.setattr(module, "PedidoRepository", Mock(return_value=orders))
    return PedidoService(factory), factory, session, clients, orders


def test_create_checks_client_and_commits_atomic_order(monkeypatch):
    service, factory, session, clients, orders = service_mocks(monkeypatch)
    request = payload(latitud=-11.9, longitud=-76.9)
    orders.coordinates.return_value = (-11.9, -76.9)
    created = service.create(request)
    clients.exists.assert_called_once_with(request.cliente_id)
    orders.add.assert_called_once()
    assert orders.add.call_args.args[1:] == (-11.9, -76.9)
    assert module.ClienteRepository.call_args.args == (session,)
    assert created.estado == "PENDIENTE"
    assert created.latitud == -11.9
    assert created.peso_kg == Decimal("12.50")
    factory.begin.return_value.__exit__.assert_called_once_with(None, None, None)


def test_missing_client_aborts_before_insert(monkeypatch):
    service, factory, _, clients, orders = service_mocks(monkeypatch)
    clients.exists.return_value = False
    with pytest.raises(PedidoClienteNoEncontrado):
        service.create(payload())
    orders.add.assert_not_called()
    assert factory.begin.return_value.__exit__.call_args.args[0] is not None


@pytest.mark.parametrize(
    "failure,expected",
    [
        (ClienteStorageError("private"), PedidoUnavailable),
        (PedidoStorageError("private"), PedidoUnavailable),
        (PedidoClienteMissing("private"), PedidoClienteNoEncontrado),
        (SQLAlchemyError("private"), PedidoUnavailable),
    ],
)
def test_storage_failures_abort_and_translate(monkeypatch, failure, expected):
    service, factory, _, clients, orders = service_mocks(monkeypatch)
    if isinstance(failure, ClienteStorageError):
        clients.exists.side_effect = failure
    else:
        orders.add.side_effect = failure
    with pytest.raises(expected) as raised:
        service.create(payload())
    assert "private" not in str(raised.value)
    assert factory.begin.return_value.__exit__.call_args.args[0] is not None
