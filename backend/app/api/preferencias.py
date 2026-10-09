"""Protected preferences of an existing client."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.dependencies import require_permission
from app.api.validation import PrivateValidationRoute
from app.core.rbac import Identidad, Permiso
from app.schemas.preferencias import PreferenciasResponse, PreferenciasUpdate
from app.services.preferencias import (
    ClienteNoEncontrado,
    PreferenciasNoDisponibles,
    PreferenciasService,
)

router = APIRouter(
    prefix="/clientes", tags=["preferencias"], route_class=PrivateValidationRoute
)


def get_preference_service(request: Request) -> PreferenciasService:
    factory = getattr(request.app.state, "session_factory", None)
    if factory is None:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Servicio no disponible"
        )
    return PreferenciasService(factory)


def _translate(operation):
    try:
        return operation()
    except ClienteNoEncontrado:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Cliente no encontrado"
        ) from None
    except PreferenciasNoDisponibles:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Servicio no disponible"
        ) from None


@router.get("/{cliente_id}/preferencias", response_model=PreferenciasResponse)
def get_preferences(
    cliente_id: UUID,
    service: Annotated[PreferenciasService, Depends(get_preference_service)],
    _identity: Annotated[
        Identidad, Depends(require_permission(Permiso.CLIENTES_CONSULTAR))
    ],
) -> PreferenciasResponse:
    return PreferenciasResponse.model_validate(
        _translate(lambda: service.get(cliente_id))
    )


@router.patch("/{cliente_id}/preferencias", response_model=PreferenciasResponse)
def update_preferences(
    cliente_id: UUID,
    payload: PreferenciasUpdate,
    service: Annotated[PreferenciasService, Depends(get_preference_service)],
    _identity: Annotated[
        Identidad, Depends(require_permission(Permiso.CLIENTES_ACTUALIZAR))
    ],
) -> PreferenciasResponse:
    return PreferenciasResponse.model_validate(
        _translate(lambda: service.update(cliente_id, payload))
    )
