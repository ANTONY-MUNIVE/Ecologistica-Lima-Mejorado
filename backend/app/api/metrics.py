"""Authenticated aggregate metrics and a sanitized database readiness probe."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import text

from app.api.dependencies import require_permission
from app.core.rbac import Identidad, Permiso

router = APIRouter(tags=["observability"])


@router.get("/health/ready")
def ready(request: Request) -> dict[str, str]:
    engine = getattr(request.app.state, "engine", None)
    if engine is None:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Base de datos no disponible"
        )
    try:
        with engine.connect() as connection:
            if connection.scalar(text("SELECT 1")) != 1:
                raise RuntimeError("Probe failed")
    except Exception:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Base de datos no disponible"
        ) from None
    return {"status": "ok", "database": "ok"}


@router.get("/internal/metrics")
def metrics(
    request: Request,
    _identity: Annotated[
        Identidad, Depends(require_permission(Permiso.AUDITORIA_CONSULTAR))
    ],
) -> dict:
    return request.app.state.metrics.snapshot()
