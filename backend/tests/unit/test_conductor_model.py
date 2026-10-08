"""Schema contract for the driver migration."""

from datetime import date, datetime, timezone

from sqlalchemy import CheckConstraint, ForeignKeyConstraint, UniqueConstraint

from app.models.conductor import Conductor


def test_driver_schema_has_required_fields_and_restricted_identity():
    table = Conductor.__table__
    assert tuple(table.columns.keys()) == (
        "conductor_id",
        "usuario_id",
        "nombre",
        "dni",
        "licencia",
        "licencia_vigente_hasta",
        "experiencia_anios",
        "telefono",
        "disponible_desde",
        "disponible_hasta",
        "punto_partida",
    )
    assert all(
        column.nullable is False
        for column in table.columns
        if column.name != "usuario_id"
    )
    assert table.c.usuario_id.nullable is True
    assert {
        item.name for item in table.constraints if isinstance(item, UniqueConstraint)
    } == {
        "uq_conductor_dni",
        "uq_conductor_usuario_id",
    }
    assert any(
        isinstance(item, ForeignKeyConstraint) and item.name == "fk_conductor_usuario"
        for item in table.constraints
    )
    assert {
        item.name for item in table.constraints if isinstance(item, CheckConstraint)
    } == {
        "ck_conductor_dni",
        "ck_conductor_nombre",
        "ck_conductor_licencia",
        "ck_conductor_telefono",
        "ck_conductor_punto_partida",
        "ck_conductor_experiencia",
        "ck_conductor_disponibilidad",
    }


def test_driver_representation_does_not_expose_personal_data():
    driver = Conductor(
        nombre="Persona sintética",
        dni="12345678",
        licencia="SYN-001",
        licencia_vigente_hasta=date(2027, 1, 1),
        experiencia_anios=1,
        telefono="000000000",
        disponible_desde=datetime(2026, 10, 8, tzinfo=timezone.utc),
        disponible_hasta=datetime(2026, 10, 9, tzinfo=timezone.utc),
        punto_partida="Punto de prueba",
    )
    assert repr(driver) == "<Conductor>"
