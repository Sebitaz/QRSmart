# QRSmart · Frontend

React 19 + Vite + React Router.

## Puesta en marcha (local)

```bash
cd frontend
npm install
cp .env.example .env     # en Windows: copy .env.example .env
npm run dev
```

La app queda en http://localhost:5173. El backend debe estar corriendo: el frontend llama a
`/api` y el proxy de Vite (ver `vite.config.js`) reenvía esas peticiones a Django en
`http://127.0.0.1:8000`, así que no hace falta configurar CORS ni la URL de la API.

| Variable           | Por defecto               | Uso                                             |
|--------------------|---------------------------|-------------------------------------------------|
| `VITE_API_URL`     | `/api`                    | URL base de la API                              |
| `VITE_BACKEND_URL` | `http://127.0.0.1:8000`   | A dónde reenvía el proxy de Vite (solo en dev)  |
| `VITE_PUBLIC_URL`  | `http://<IP-del-PC>:5173` | URL que va dentro del QR de las entradas        |

### Probar el QR desde el celular

El servidor de desarrollo acepta conexiones de la red local y el QR de cada entrada guarda
una URL (`http://<IP-del-PC>:5173/entrada/<código>`). Al escanearlo el celular abre la vista
de la entrada con su estado.

1. Conecta el celular a la **misma red WiFi** que el PC.
2. Ejecuta `npm run dev`; Vite muestra la dirección de red (`Network: http://192.168.x.x:5173/`).
3. La primera vez, Windows puede preguntar si permitir Node.js en redes privadas: acepta.
4. Abre "Mis entradas" y escanea el QR con la cámara del celular.

Si la red no deja que los dispositivos se vean entre sí (redes corporativas o públicas),
conecta el PC al hotspot del celular, o usa un túnel y pon su URL en `VITE_PUBLIC_URL`.

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
| `/entrada/:code`               | Público       | Vista de la entrada (abre el QR) |
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
