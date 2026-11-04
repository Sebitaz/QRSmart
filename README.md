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

Requisitos: Python 3.12+ y Node.js 20+. Desde la raíz del repositorio:

```bash
npm run setup   # solo la primera vez o cuando cambien dependencias
npm run dev     # levanta backend (puerto 8000) y frontend (puerto 5173); Ctrl+C detiene ambos
```

| Comando                | Descripción                                                        |
|------------------------|--------------------------------------------------------------------|
| `npm run setup`        | Crea el `.venv`, instala dependencias de backend y frontend y migra |
| `npm run dev`          | Inicia backend y frontend al mismo tiempo                          |
| `npm run dev:backend`  | Inicia solo el backend                                             |
| `npm run dev:frontend` | Inicia solo el frontend                                            |
| `npm run build`        | Build de producción del frontend                                   |
| `npm run lint`         | Linter del frontend                                                |

- App: http://localhost:5173 (desde el celular, en la misma WiFi: la dirección `Network` que muestra Vite)
- API (Swagger): http://localhost:8000/api/docs/

También se puede trabajar en cada carpeta por separado (ver sus README).

## Historias de usuario implementadas

| HU      | Descripción                              | Estado         |
|---------|------------------------------------------|----------------|
| HU 4.1  | Registro e Inicio de Sesión              | ✅ Implementada |
| HU 4.2  | Redirección y Experiencia por Rol        | ✅ Implementada |
| HU 4.3  | Control de Acceso en la API              | ✅ Implementada |
| HU 1.1  | Creación de Eventos                      | ✅ Implementada |
| HU 2.1  | Compra/Adquisición de ticket             | ✅ Implementada |

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
