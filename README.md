# QRSmart

Sistema Inteligente de Control de Aforo y Accesos QR — Ingeniería de Software 2, I.U. Pascual Bravo.

## Estructura del repositorio

| Carpeta     | Descripción                                   | Tecnología                     |
|-------------|-----------------------------------------------|--------------------------------|
| `backend/`  | API REST (lógica de negocio, auth, eventos)   | Python · Django · DRF · JWT    |
| `frontend/` | SPA para organizador, logística y asistentes  | React · Vite · React Router    |

Cada carpeta tiene su propio README con instrucciones para ejecutarla.

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
