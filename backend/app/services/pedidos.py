"""Atomic order registration without route planning side effects."""

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from app.models.pedido import Pedido
from app.repositories.clientes import ClienteRepository, ClienteStorageError
from app.repositories.pedidos import (
    PedidoClienteMissing,
    PedidoRepository,
    PedidoStorageError,
)
from app.schemas.pedido import PedidoCreate, PedidoResponse


class PedidoClienteNoEncontrado(LookupError):
    """The requested client does not exist."""


class PedidoUnavailable(RuntimeError):
    """Sanitized order service failure."""


class PedidoService:
    def __init__(self, factory: sessionmaker[Session]) -> None:
        self._factory = factory

    def create(self, payload: PedidoCreate) -> PedidoResponse:
        try:
            with self._factory.begin() as session:
                if not ClienteRepository(session).exists(payload.cliente_id):
                    raise PedidoClienteNoEncontrado("Client not found")
                pedido = Pedido(
                    cliente_id=payload.cliente_id,
                    direccion=payload.direccion,
                    referencia=payload.referencia,
                    peso_kg=payload.peso_kg,
                    volumen_m3=payload.volumen_m3,
                    ventana_inicio=payload.ventana_inicio,
                    ventana_fin=payload.ventana_fin,
                    prioridad=payload.prioridad.value,
                    tipo_producto=payload.tipo_producto,
                )
                repository = PedidoRepository(session)
                repository.add(pedido, payload.latitud, payload.longitud)
                latitude, longitude = repository.coordinates(pedido.pedido_id)
                return PedidoResponse(
                    pedido_id=pedido.pedido_id,
                    cliente_id=pedido.cliente_id,
                    direccion=pedido.direccion,
                    referencia=pedido.referencia,
                    latitud=latitude,
                    longitud=longitude,
                    peso_kg=pedido.peso_kg,
                    volumen_m3=pedido.volumen_m3,
                    ventana_inicio=pedido.ventana_inicio,
                    ventana_fin=pedido.ventana_fin,
                    prioridad=pedido.prioridad,
                    tipo_producto=pedido.tipo_producto,
                    estado=pedido.estado,
                )
        except (PedidoClienteNoEncontrado, PedidoClienteMissing):
            raise PedidoClienteNoEncontrado("Client not found") from None
        except (ClienteStorageError, PedidoStorageError, SQLAlchemyError):
            raise PedidoUnavailable("Order service unavailable") from None
