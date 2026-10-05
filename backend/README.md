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

| Método | Ruta                   | Auth | Descripción                                  |
|--------|------------------------|------|----------------------------------------------|
| POST   | `/api/auth/register/`  | No   | Registro (rol `ORGANIZADOR` o `ASISTENTE`)    |
| POST   | `/api/auth/login/`     | No   | Login con email y contraseña → JWT + usuario |
| POST   | `/api/auth/refresh/`   | No   | Renueva el access token                      |
| POST   | `/api/auth/logout/`    | Sí   | Invalida el refresh token                    |
| GET    | `/api/auth/me/`        | Sí   | Datos del usuario autenticado y su rol       |
| GET    | `/api/events/`         | Sí   | Eventos del organizador autenticado          |
| POST   | `/api/events/`         | Sí   | Crear evento                                 |
| GET    | `/api/events/{id}/`    | Sí   | Detalle de un evento propio                  |

Las peticiones autenticadas usan el encabezado `Authorization: Bearer <access>`.

## Estructura

```
backend/
├── config/            # settings, urls, wsgi/asgi
└── apps/
    ├── accounts/      # usuario con roles + autenticación JWT
    └── events/        # eventos y aforo
```

## Roles

- `ORGANIZADOR`: crea eventos y ve el aforo.
- `LOGISTICA`: valida QRs en la puerta. Se crea desde `/admin` (no se puede auto-registrar).
- `ASISTENTE`: recibe sus entradas QR.
