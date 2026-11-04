# QRSmart · Backend (API REST)

Django 6 + Django REST Framework + JWT (SimpleJWT). Documentación interactiva con Swagger.

## Requisitos

- Python 3.12 o superior

## Puesta en marcha (local)

```bash
cd backend
python -m venv .venv

# Windows (PowerShell)
.venv\Scripts\Activate.ps1
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env          # en Windows: copy .env.example .env
python manage.py migrate
python manage.py createsuperuser   # opcional, para entrar a /admin
python manage.py runserver
```

- API: http://localhost:8000/api/
- Swagger: http://localhost:8000/api/docs/
- Admin: http://localhost:8000/admin/

Sin `DATABASE_URL` se usa SQLite. Para PostgreSQL (Supabase) define `DATABASE_URL` en `.env`.

## Pruebas

```bash
python manage.py test apps
```

## Endpoints

| Método | Ruta                       | Roles permitidos           | Descripción                                  |
|--------|----------------------------|----------------------------|----------------------------------------------|
| POST   | `/api/auth/register/`      | Público                    | Registro (rol `ORGANIZADOR` o `ASISTENTE`)    |
| POST   | `/api/auth/login/`         | Público                    | Login con email y contraseña → JWT + usuario |
| POST   | `/api/auth/refresh/`       | Público                    | Renueva el access token                      |
| POST   | `/api/auth/logout/`        | Cualquier autenticado      | Invalida el refresh token                    |
| GET    | `/api/auth/me/`            | Cualquier autenticado      | Datos del usuario autenticado y su rol       |
| GET    | `/api/events/`             | `ORGANIZADOR`              | Eventos del organizador autenticado          |
| POST   | `/api/events/`             | `ORGANIZADOR`              | Crear evento                                 |
| GET    | `/api/events/{id}/`        | `ORGANIZADOR`              | Detalle de un evento propio                  |
| GET    | `/api/events/available/`   | `ASISTENTE`                | Eventos con entradas disponibles             |
| GET    | `/api/tickets/`            | `ASISTENTE`                | Entradas del asistente                       |
| POST   | `/api/tickets/`            | `ASISTENTE`                | Adquirir una entrada (`{"event": "<uuid>"}`) |
| GET    | `/api/tickets/{id}/`       | `ASISTENTE`                | Detalle de una entrada propia                |
| POST   | `/api/tickets/validate/`   | `ORGANIZADOR`, `LOGISTICA` | Marca como usado el ticket del QR (`{"code": "<uuid>"}`) |
| GET    | `/api/tickets/public/{code}/` | Público (solo lectura)  | Vista de la entrada que abre el QR           |

Las peticiones autenticadas usan el encabezado `Authorization: Bearer <access>`.

### Autorización (HU 4.3)

- Sin token o token inválido → `401 Unauthorized`.
- Token válido pero rol no permitido → `403 Forbidden`.
- Los permisos están en `apps/accounts/permissions.py` (`IsOrganizador`, `IsLogistica`,
  `IsAsistente`/`IsCliente`, `IsOrganizadorOrLogistica`). El rol se lee del usuario en BD,
  no del claim del JWT, para que un cambio de rol aplique de inmediato.

### Adquisición de entradas (HU 2.1)

- Cada asistente puede tener una sola entrada activa por evento.
- No se pueden adquirir más entradas que la capacidad del evento.
- Solo se pueden adquirir entradas de eventos programados o en curso que no hayan terminado.
- Si alguna regla no se cumple la API responde `409 Conflict` con el motivo en `detail`.

### Vista pública de la entrada (QR)

- `GET /api/tickets/public/{code}/` no requiere sesión: es lo que consulta el celular al
  escanear el QR. Ignora el encabezado `Authorization`, así un token vencido no da `401`.
- Solo expone evento (nombre, lugar, fechas, estado), estado de la entrada y el titular
  abreviado (`Juan V.`). No incluye email, ids internos ni apellidos completos.
- Es de solo lectura; validar la entrada sigue requiriendo `ORGANIZADOR` o `LOGISTICA`.

## Estructura

```
backend/
├── config/            # settings, urls, wsgi/asgi
└── apps/
    ├── accounts/      # usuario con roles + autenticación JWT + permisos por rol
    ├── events/        # eventos y aforo
    └── tickets/       # tickets QR y validación en puerta
```

## Roles

- `ORGANIZADOR`: crea eventos, ve el aforo y puede validar QRs.
- `LOGISTICA`: valida QRs en la puerta. Se crea desde `/admin` (no se puede auto-registrar).
- `ASISTENTE` ("Cliente" en las HU): recibe sus entradas QR.
