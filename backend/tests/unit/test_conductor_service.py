"""Transactional driver behavior with controlled storage failures."""

from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from functools import partial
from unittest.mock import Mock
from uuid import uuid4
from zoneinfo import ZoneInfo

import pytest
from sqlalchemy.exc import SQLAlchemyError

from app.models.conductor import Conductor
from app.repositories.conductores import DriverStorageError, DuplicateDriverError
from app.schemas.conductor import DriverCreate, DriverUpdate
from app.services.conductores import (
    ConductorService,
    DriverDuplicate,
    DriverInvalid,
    DriverNotFound,
    DriverUnavailable,
)


def values():
    start = datetime.now(timezone.utc) + timedelta(days=1)
    return {
        "nombre": "Conductor sintético",
        "dni": "12345678",
        "licencia": "SYN-001",
        "licencia_vigente_hasta": datetime.now(ZoneInfo("America/Lima")).date()
        + timedelta(days=30),
        "experiencia_anios": 2,
        "telefono": "000000000",
        "disponible_desde": start,
        "disponible_hasta": start + timedelta(hours=8),
        "punto_partida": "Depósito de prueba",
    }


class FakeFactory:
    def __init__(self):
        self.session = Mock()
        self.entered = 0

    @contextmanager
    def begin(self):
        self.entered += 1
        yield self.session

    @contextmanager
    def __call__(self):
        self.entered += 1
        yield self.session


def setup(monkeypatch):
    factory = FakeFactory()
    repository = Mock()
    monkeypatch.setattr(
        "app.services.conductores.ConductorRepository", lambda _: repository
    )
    return ConductorService(factory), repository, factory


def test_create_validates_linked_user_and_duplicate_without_committing(monkeypatch):
    service, repository, factory = setup(monkeypatch)
    payload = DriverCreate(**values(), usuario_id=uuid4())
    repository.user_is_driver.return_value = False
    with pytest.raises(DriverInvalid):
        service.create(payload)
    repository.add.assert_not_called()

    repository.user_is_driver.return_value = True
    created = service.create(payload)
    assert created.usuario_id == payload.usuario_id
    assert repository.add.call_args.args[0] is created
    assert factory.entered == 2

    repository.add.side_effect = DuplicateDriverError()
    with pytest.raises(DriverDuplicate):
        service.create(payload)


def test_update_rejects_invalid_combined_window_before_flush(monkeypatch):
    service, repository, _factory = setup(monkeypatch)
    driver = Conductor(conductor_id=uuid4(), **values())
    repository.get.return_value = driver
    with pytest.raises(DriverInvalid):
        service.update(
            driver.conductor_id,
            DriverUpdate(
                disponible_hasta=driver.disponible_desde - timedelta(minutes=1)
            ),
        )
    repository.flush.assert_not_called()

    driver.disponible_hasta = driver.disponible_desde + timedelta(hours=8)
    updated = service.update(driver.conductor_id, DriverUpdate(experiencia_anios=3))
    assert updated.experiencia_anios == 3
    repository.flush.assert_called_once()


def test_update_cannot_keep_an_expired_license(monkeypatch):
    service, repository, _factory = setup(monkeypatch)
    driver = Conductor(conductor_id=uuid4(), **values())
    driver.licencia_vigente_hasta = datetime.now(
        ZoneInfo("America/Lima")
    ).date() - timedelta(days=1)
    repository.get.return_value = driver
    with pytest.raises(DriverInvalid):
        service.update(driver.conductor_id, DriverUpdate(experiencia_anios=3))
    repository.flush.assert_not_called()


def test_gets_and_not_found(monkeypatch):
    service, repository, _factory = setup(monkeypatch)
    driver = Conductor(conductor_id=uuid4(), **values())
    repository.get.return_value = driver
    repository.get_by_user.return_value = driver
    repository.list_all.return_value = [driver]
    assert service.get(driver.conductor_id) is driver
    assert service.get_by_user(uuid4()) is driver
    assert service.list_all() == [driver]

    repository.get.return_value = None
    repository.get_by_user.return_value = None
    with pytest.raises(DriverNotFound):
        service.get(uuid4())
    with pytest.raises(DriverNotFound):
        service.get_by_user(uuid4())
    with pytest.raises(DriverNotFound):
        service.update(uuid4(), DriverUpdate(experiencia_anios=3))


@pytest.mark.parametrize(
    "method", ["create", "list_all", "get", "get_by_user", "update"]
)
def test_storage_failures_are_sanitized(monkeypatch, method):
    service, repository, _factory = setup(monkeypatch)
    if method == "create":
        repository.add.side_effect = DriverStorageError("private SQL")
        call = partial(service.create, DriverCreate(**values()))
    elif method == "list_all":
        repository.list_all.side_effect = SQLAlchemyError("private SQL")
        call = service.list_all
    elif method == "get":
        repository.get.side_effect = DriverStorageError("private SQL")
        call = partial(service.get, uuid4())
    elif method == "get_by_user":
        repository.get_by_user.side_effect = SQLAlchemyError("private SQL")
        call = partial(service.get_by_user, uuid4())
    else:
        repository.get.side_effect = SQLAlchemyError("private SQL")
        call = partial(service.update, uuid4(), DriverUpdate(experiencia_anios=3))
    with pytest.raises(DriverUnavailable) as error:
        call()
    assert "private SQL" not in str(error.value)


def test_update_duplicate_user_is_conflict(monkeypatch):
    service, repository, _factory = setup(monkeypatch)
    driver = Conductor(conductor_id=uuid4(), **values())
    repository.get.return_value = driver
    repository.flush.side_effect = DuplicateDriverError()
    with pytest.raises(DriverDuplicate):
        service.update(driver.conductor_id, DriverUpdate(dni="87654321"))
