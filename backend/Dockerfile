FROM python:3.12.10-slim-bookworm@sha256:fd95fa221297a88e1cf49c55ec1828edd7c5a428187e67b5d1805692d11588db

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.lock ./
RUN python -m pip install --no-cache-dir -r requirements.lock \
    && python -m pip check

COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./

RUN groupadd --system app \
    && useradd --system --gid app --home-dir /app --no-create-home app

USER app

EXPOSE 8000
CMD ["python", "-m", "uvicorn", "app.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
