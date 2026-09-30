from decimal import Decimal
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.pedido import PedidoCreate


def valid_order(**changes):
    data = {
        "cliente_id": uuid4(),
        "direccion": "Av. Principal 123",
        "latitud": -11.987654,
        "longitud": -76.987654,
        "peso_kg": Decimal("12.50"),
        "volumen_m3": Decimal("0.080"),
        "ventana_inicio": "2026-10-01T09:00:00-05:00",
        "ventana_fin": "2026-10-01T11:00:00-05:00",
        "prioridad": "ESTANDAR",
        "tipo_producto": "PRODUCTO_PRUEBA",
    }
    data.update(changes)
    return data


def test_valid_coordinates_reference_and_both():
    coordinates = PedidoCreate.model_validate(valid_order())
    assert (coordinates.latitud, coordinates.longitud) == (-11.987654, -76.987654)
    reference = PedidoCreate.model_validate(
        valid_order(latitud=None, longitud=None, referencia=" Frente al parque ")
    )
    assert reference.referencia == "Frente al parque"
    both = PedidoCreate.model_validate(valid_order(referencia=" Cerca al colegio "))
    assert both.referencia == "Cerca al colegio"


@pytest.mark.parametrize(
    "changes",
    [
        {"latitud": None, "longitud": None},
        {"latitud": None},
        {"longitud": None},
        {"latitud": -90.0001},
        {"latitud": 90.0001},
        {"longitud": -180.0001},
        {"longitud": 180.0001},
        {"latitud": float("nan")},
        {"longitud": float("inf")},
        {"direccion": " \t "},
        {"direccion": "a" * 256},
        {"referencia": " \t "},
        {"referencia": "a" * 256},
        {"peso_kg": Decimal("0")},
        {"peso_kg": Decimal("-1")},
        {"peso_kg": Decimal("NaN")},
        {"peso_kg": Decimal("Infinity")},
        {"peso_kg": Decimal("1.001")},
        {"peso_kg": Decimal("100000000.00")},
        {"volumen_m3": Decimal("0")},
        {"volumen_m3": Decimal("-1")},
        {"volumen_m3": Decimal("NaN")},
        {"volumen_m3": Decimal("-Infinity")},
        {"volumen_m3": Decimal("1.0001")},
        {"ventana_fin": "2026-10-01T08:00:00-05:00"},
        {"ventana_fin": "2026-10-01T09:00:00-05:00"},
        {"ventana_inicio": "2026-10-01T09:00:00"},
        {"ventana_fin": "2026-10-01T11:00:00"},
        {"prioridad": "URGENTE"},
        {"tipo_producto": "   "},
        {"tipo_producto": "x" * 21},
        {"estado": "ENTREGADO"},
        {"pedido_id": str(uuid4())},
        {"otro_campo": "valor"},
    ],
)
def test_invalid_order_rejected(changes):
    with pytest.raises(ValidationError):
        PedidoCreate.model_validate(valid_order(**changes))


def test_text_normalization_and_coordinate_boundaries():
    order = PedidoCreate.model_validate(
        valid_order(
            direccion=" Av. Principal 123 ",
            tipo_producto="  Libre  ",
            latitud=-90,
            longitud=180,
        )
    )
    assert order.direccion == "Av. Principal 123"
    assert order.tipo_producto == "Libre"
    assert (order.latitud, order.longitud) == (-90, 180)
