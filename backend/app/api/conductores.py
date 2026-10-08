"""Protected driver registration, consultation and availability changes."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.dependencies import get_authenticated_session, require_permission
from app.core.rbac import Contexto, Identidad, Permiso
from app.repositories.auditoria import AuditStorageError
from app.schemas.conductor import DriverCreate, DriverResponse, DriverUpdate
from app.services.autenticacion import AuthenticatedSession
from app.services.autorizacion import AuthorizationDenied, AutorizacionService
from app.services.conductores import (
    ConductorService,
    DriverDuplicate,
    DriverInvalid,
    DriverNotFound,
    DriverUnavailable,
)

router = APIRouter(prefix="/conductores", tags=["conductores"])


def get_driver_service(request: Request) -> ConductorService:
    factory = getattr(request.app.state, "session_factory", None)
    if factory is None:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Servicio no disponible"
        )
    return ConductorService(factory)


def _translate(operation):
    try:
        return operation()
    except DriverNotFound:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Conductor no encontrado"
        ) from None
    except DriverDuplicate:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "El DNI o usuario ya está registrado"
        ) from None
    except DriverInvalid as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(error)) from None
    except DriverUnavailable:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Servicio no disponible"
        ) from None


@router.post("", response_model=DriverResponse, status_code=status.HTTP_201_CREATED)
def create_driver(
    payload: DriverCreate,
    service: Annotated[ConductorService, Depends(get_driver_service)],
    _identity: Annotated[
        Identidad, Depends(require_permission(Permiso.CONDUCTORES_CREAR))
    ],
) -> DriverResponse:
    return DriverResponse.model_validate(_translate(lambda: service.create(payload)))


@router.get("", response_model=list[DriverResponse])
def list_drivers(
    service: Annotated[ConductorService, Depends(get_driver_service)],
    _identity: Annotated[
        Identidad, Depends(require_permission(Permiso.CONDUCTORES_CONSULTAR))
    ],
) -> list[DriverResponse]:
    return [DriverResponse.model_validate(row) for row in _translate(service.list_all)]


@router.get("/me", response_model=DriverResponse)
def get_own_driver(
    request: Request,
    service: Annotated[ConductorService, Depends(get_driver_service)],
    authenticated: Annotated[AuthenticatedSession, Depends(get_authenticated_session)],
) -> DriverResponse:
    authorization: AutorizacionService | None = getattr(
        request.app.state, "authorization_service", None
    )
    if authorization is None:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Servicio no disponible"
        )
    identity = authenticated.identidad
    try:
        authorization.autorizar(
            identity,
            Permiso.CONDUCTORES_CONSULTAR,
            Contexto(propietario_id=identity.usuario_id),
        )
    except AuthorizationDenied:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acceso denegado") from None
    except AuditStorageError:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Servicio no disponible"
        ) from None
    return DriverResponse.model_validate(
        _translate(lambda: service.get_by_user(identity.usuario_id))
    )


@router.get("/{driver_id}", response_model=DriverResponse)
def get_driver(
    driver_id: UUID,
    service: Annotated[ConductorService, Depends(get_driver_service)],
    _identity: Annotated[
        Identidad, Depends(require_permission(Permiso.CONDUCTORES_CONSULTAR))
    ],
) -> DriverResponse:
    return DriverResponse.model_validate(_translate(lambda: service.get(driver_id)))


@router.patch("/{driver_id}", response_model=DriverResponse)
def update_driver(
    driver_id: UUID,
    payload: DriverUpdate,
    service: Annotated[ConductorService, Depends(get_driver_service)],
    _identity: Annotated[
        Identidad, Depends(require_permission(Permiso.CONDUCTORES_ACTUALIZAR))
    ],
) -> DriverResponse:
    return DriverResponse.model_validate(
        _translate(lambda: service.update(driver_id, payload))
    )
