# QRSmart · Frontend

React 19 + Vite + React Router.

## Puesta en marcha (local)

```bash
cd frontend
npm install
cp .env.example .env     # en Windows: copy .env.example .env
npm run dev
```

La app queda en http://localhost:5173 y consume la API definida en `VITE_API_URL`
(por defecto `http://localhost:8000/api`). El backend debe estar corriendo.

## Scripts

| Comando           | Descripción                     |
|-------------------|---------------------------------|
| `npm run dev`     | Servidor de desarrollo          |
| `npm run build`   | Build de producción en `dist/`  |
| `npm run lint`    | Linter (oxlint)                 |
| `npm run preview` | Sirve el build localmente       |

## Rutas

| Ruta                           | Acceso        | Descripción                     |
|--------------------------------|---------------|---------------------------------|
| `/login`, `/registro`          | Público       | Autenticación                   |
| `/organizador`                 | Organizador   | Mis eventos + aforo             |
| `/organizador/eventos/nuevo`   | Organizador   | Crear evento                    |
| `/logistica`                   | Logística     | Control de acceso (escáner)     |
| `/asistente`                   | Asistente     | Mis entradas con código QR      |
| `/asistente/eventos`           | Asistente     | Eventos disponibles             |

Al iniciar sesión cada usuario es redirigido al inicio de su rol; si intenta abrir
una ruta de otro rol, se le devuelve a la suya con un aviso.

## Estructura

```
src/
├── api/          # cliente HTTP (JWT + refresh) y servicios por recurso
├── components/   # layout, rutas protegidas, campos de formulario
├── constants/    # roles, rutas de inicio y menús por rol
├── context/      # sesión del usuario (AuthProvider / useAuth)
└── pages/        # páginas públicas y por rol
```
