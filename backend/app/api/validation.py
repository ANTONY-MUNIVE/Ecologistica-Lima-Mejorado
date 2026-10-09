"""Validation errors for personal-data routes without echoing request content."""

from collections.abc import Callable, Coroutine
from typing import Any

from fastapi import Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute


class PrivateValidationRoute(APIRoute):
    def get_route_handler(self) -> Callable[[Request], Coroutine[Any, Any, Response]]:
        original_handler = super().get_route_handler()
        known_fields = {parameter.name for parameter in self.dependant.path_params}
        for parameter in self.dependant.body_params:
            known_fields.update(
                getattr(parameter.field_info.annotation, "model_fields", {})
            )

        async def handler(request: Request) -> Response:
            try:
                return await original_handler(request)
            except RequestValidationError as error:
                details = []
                for item in error.errors():
                    # Unknown property names can themselves contain private data.
                    location = [
                        part
                        for part in item["loc"]
                        if part in {"body", "path"} or part in known_fields
                    ]
                    details.append(
                        {
                            "type": item["type"],
                            "loc": location or ["body"],
                            "msg": item["msg"],
                        }
                    )
                return JSONResponse(status_code=422, content={"detail": details})

        return handler
