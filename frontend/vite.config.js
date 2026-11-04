import react from '@vitejs/plugin-react'
import { networkInterfaces } from 'node:os'
import { defineConfig, loadEnv } from 'vite'

const PORT = 5173

// adaptadores virtuales (WSL, Docker, VirtualBox...) que el celular no puede alcanzar
const VIRTUAL_ADAPTER = /vethernet|virtualbox|vmware|hyper-v|wsl|docker|loopback|tailscale|zerotier/i

// IP del PC en la red WiFi/LAN, para que el QR abra desde el celular
function lanAddress() {
  const candidates = Object.entries(networkInterfaces())
    .filter(([name]) => !VIRTUAL_ADAPTER.test(name))
    .flatMap(([, addresses]) => addresses ?? [])
    .filter((a) => a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.'))
    .map((a) => a.address)
  // las redes de casa suelen ser 192.168.x.x
  return candidates.find((ip) => ip.startsWith('192.168.')) ?? candidates[0] ?? null
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // VITE_PUBLIC_URL permite forzarla (p. ej. un túnel); en build se usa el dominio donde se sirva
  const ip = command === 'serve' ? lanAddress() : null
  const publicUrl = env.VITE_PUBLIC_URL || (ip ? `http://${ip}:${PORT}` : '')

  return {
    plugins: [react()],
    define: {
      __PUBLIC_URL__: JSON.stringify(publicUrl.replace(/\/$/, '')),
    },
    server: {
      port: PORT,
      host: true, // acepta conexiones de otros dispositivos de la red (el celular)
      proxy: {
        // el navegador llama a /api en el mismo origen y Vite lo reenvía a Django;
        // así el celular no necesita llegar al puerto 8000 y no hay CORS
        '/api': { target: env.VITE_BACKEND_URL || 'http://127.0.0.1:8000', changeOrigin: true },
      },
    },
  }
})
