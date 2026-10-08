"""Repository maps database constraints without exposing driver details."""

from types import SimpleNamespace
from unittest.mock import Mock
from uuid import uuid4

import pytest
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.models.conductor import Conductor
from app.repositories.conductores import (
    ConductorRepository,
    DriverStorageError,
    DuplicateDriverError,
)


def integrity_error(constraint):
    original = Exception("private SQL")
    original.diag = SimpleNamespace(constraint_name=constraint)
    return IntegrityError("insert", {}, original)


def test_duplicate_dni_and_user_are_conflicts():
    session = Mock()
    repository = ConductorRepository(session)
    for constraint in ("uq_conductor_dni", "uq_conductor_usuario_id"):
        session.flush.side_effect = integrity_error(constraint)
        with pytest.raises(DuplicateDriverError) as error:
            repository.add(Conductor())
        assert "private SQL" not in str(error.value)


def test_other_integrity_and_database_errors_are_sanitized():
    session = Mock()
    repository = ConductorRepository(session)
    session.flush.side_effect = integrity_error("ck_conductor_disponibilidad")
    with pytest.raises(DriverStorageError):
        repository.flush()
    session.flush.side_effect = SQLAlchemyError("private SQL")
    with pytest.raises(DriverStorageError) as error:
        repository.flush()
    assert "private SQL" not in str(error.value)


def test_read_methods_use_query_results_and_hide_storage_errors():
    session = Mock()
    repository = ConductorRepository(session)
    row = Conductor(conductor_id=uuid4())
    session.scalar.return_value = row
    session.scalars.return_value.all.return_value = [row]
    assert repository.get(row.conductor_id) is row
    assert repository.get(row.conductor_id, for_update=True) is row
    assert repository.get_by_user(uuid4()) is row
    assert repository.list_all() == [row]

    session.scalar.side_effect = SQLAlchemyError("private SQL")
    with pytest.raises(DriverStorageError):
        repository.get(row.conductor_id)
    with pytest.raises(DriverStorageError):
        repository.get_by_user(uuid4())
    session.scalars.side_effect = SQLAlchemyError("private SQL")
    with pytest.raises(DriverStorageError):
        repository.list_all()


def test_linked_account_must_be_active_driver():
    session = Mock()
    repository = ConductorRepository(session)
    session.get.return_value = SimpleNamespace(rol="CONDUCTOR", estado="ACTIVO")
    assert repository.user_is_driver(uuid4()) is True
    session.get.return_value = SimpleNamespace(rol="OPERADOR", estado="ACTIVO")
    assert repository.user_is_driver(uuid4()) is False
    session.get.side_effect = SQLAlchemyError("private SQL")
    with pytest.raises(DriverStorageError):
        repository.user_is_driver(uuid4())
