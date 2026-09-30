"""Order persistence and spatial projection; callers own transactions."""

from uuid import UUID

from geoalchemy2 import Geography, Geometry
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.pedido import Pedido


class PedidoStorageError(RuntimeError):
    """Sanitized order storage failure."""


class PedidoClienteMissing(PedidoStorageError):
    """Client disappeared before the order insert."""


class PedidoRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(
        self, pedido: Pedido, latitud: float | None, longitud: float | None
    ) -> None:
        if latitud is not None and longitud is not None:
            pedido.ubicacion = func.ST_SetSRID(
                func.ST_MakePoint(longitud, latitud), 4326
            ).cast(Geography(geometry_type="POINT", srid=4326))
        try:
            self._session.add(pedido)
            self._session.flush()
        except IntegrityError as error:
            constraint = getattr(
                getattr(error.orig, "diag", None), "constraint_name", None
            )
            if constraint == "fk_pedido_cliente_id_cliente":
                raise PedidoClienteMissing("Client not found") from None
            raise PedidoStorageError("Order storage unavailable") from None
        except SQLAlchemyError:
            raise PedidoStorageError("Order storage unavailable") from None

    def coordinates(self, pedido_id: UUID) -> tuple[float | None, float | None]:
        geometry = Pedido.ubicacion.cast(Geometry(geometry_type="POINT", srid=4326))
        try:
            row = self._session.execute(
                select(func.ST_Y(geometry), func.ST_X(geometry)).where(
                    Pedido.pedido_id == pedido_id
                )
            ).one()
            return row[0], row[1]
        except SQLAlchemyError:
            raise PedidoStorageError("Order storage unavailable") from None
