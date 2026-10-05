# QRSmart

Sistema Inteligente de Control de Aforo y Accesos QR — Ingeniería de Software 2, I.U. Pascual Bravo.

## Estructura del repositorio

| Carpeta     | Descripción                                   | Tecnología                     |
|-------------|-----------------------------------------------|--------------------------------|
| `backend/`  | API REST (lógica de negocio, auth, eventos)   | Python · Django · DRF · JWT    |
| `frontend/` | SPA para organizador, logística y asistentes  | React · Vite · React Router    |

Cada carpeta tiene su propio README con instrucciones para ejecutarla:
[backend/README.md](backend/README.md) · [frontend/README.md](frontend/README.md).

## Inicio rápido

```bash
# Terminal 1 - API
cd backend
python -m venv .venv && .venv\Scriptsctivate   # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

## Historias de usuario implementadas (Sprint 1)

| HU      | Descripción                              | Estado         |
|---------|------------------------------------------|----------------|
| HU 4.1  | Registro e Inicio de Sesión              | ✅ Implementada |
| HU 4.2  | Redirección y Experiencia por Rol        | ✅ Implementada |
| HU 4.3  | Control de Acceso en la API              | ⏳ Pendiente    |
| HU 1.1  | Creación de Eventos                      | ✅ Implementada |

## Flujo de ramas (Git Flow simplificado)

- `main`: código estable, solo recibe merges desde `develop` al cerrar un sprint/release.
- `develop`: rama de integración del sprint.
- `feature/<descripcion>`: una rama por historia de usuario, creada desde `develop`.
- `fix/<descripcion>`: corrección de errores.

## Convención de commits (Conventional Commits)

```
<tipo>(<alcance>): <descripción en imperativo>
```

| Tipo       | Uso                                                  |
|------------|------------------------------------------------------|
| `feat`     | Nueva funcionalidad                                  |
| `fix`      | Corrección de un error                               |
| `docs`     | Solo documentación                                   |
| `test`     | Agregar o corregir pruebas                           |
| `refactor` | Cambio de código que no agrega funcionalidad ni corrige errores |
| `style`    | Formato, espacios, etc. (sin cambios de lógica)      |
| `chore`    | Configuración, dependencias, tareas de mantenimiento |

Ejemplo: `feat(auth): add JWT login endpoint`.
