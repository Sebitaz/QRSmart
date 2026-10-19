// levanta backend y frontend al tiempo; Ctrl+C apaga los dos
import { spawn, spawnSync } from 'node:child_process'
import { BACKEND, FRONTEND, hasNodeModules, hasVenv, isWindows, VENV_PYTHON } from './paths.mjs'

if (!hasVenv() || !hasNodeModules()) {
  console.error('Falta preparar el proyecto. Ejecuta primero: npm run setup')
  process.exit(1)
}

const only = process.argv[2] // "backend" o "frontend" para levantar solo uno

const services = [
  {
    name: 'backend',
    color: '\x1b[35m',
    command: VENV_PYTHON,
    args: ['manage.py', 'runserver', '8000'],
    cwd: BACKEND,
  },
  {
    name: 'frontend',
    color: '\x1b[36m',
    command: 'npm',
    args: ['run', 'dev', '--', '--port', '5173', '--strictPort'],
    cwd: FRONTEND,
  },
].filter((s) => !only || s.name === only)

if (services.some((s) => s.name === 'backend')) {
  // aplica migraciones pendientes antes de arrancar
  spawnSync(VENV_PYTHON, ['manage.py', 'migrate', '--noinput', '-v', '0'], { cwd: BACKEND, stdio: 'inherit' })
}

const children = []
let stopping = false

function stopAll(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (child.exitCode !== null) continue
    if (isWindows) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    else child.kill('SIGTERM')
  }
  process.exit(code)
}

for (const service of services) {
  const options = { cwd: service.cwd, env: { ...process.env, PYTHONUNBUFFERED: '1', FORCE_COLOR: '1' } }
  // npm necesita shell en Windows; en ese caso se pasa como un solo comando
  const child = service.command === 'npm'
    ? spawn([service.command, ...service.args].join(' '), { ...options, shell: true })
    : spawn(service.command, service.args, options)
  const prefix = `${service.color}[${service.name}]\x1b[0m `
  const print = (stream) => (data) => {
    for (const line of data.toString().split(/\r?\n/)) {
      if (line.trim()) stream.write(prefix + line + '\n')
    }
  }
  child.stdout.on('data', print(process.stdout))
  child.stderr.on('data', print(process.stderr))
  // si uno se cae, se apagan los dos
  child.on('exit', (code) => {
    if (!stopping) {
      console.error(`${prefix}se detuvo (código ${code}). Apagando todo...`)
      stopAll(code ?? 1)
    }
  })
  children.push(child)
}

console.log('Backend:  http://localhost:8000/api/docs/')
console.log('Frontend: http://localhost:5173')
console.log('Presiona Ctrl+C para detener.\n')

process.on('SIGINT', () => stopAll(0))
process.on('SIGTERM', () => stopAll(0))
