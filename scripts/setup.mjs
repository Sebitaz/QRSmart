// prepara el proyecto: entorno virtual, dependencias y migraciones
import { spawnSync } from 'node:child_process'
import { BACKEND, FRONTEND, hasVenv, isWindows, VENV_PYTHON } from './paths.mjs'

function run(label, command, args, cwd) {
  console.log(`\n> ${label}`)
  // npm necesita shell en Windows; en ese caso se pasa como un solo comando
  const result = command === 'npm'
    ? spawnSync(['npm', ...args].join(' '), { cwd, stdio: 'inherit', shell: true })
    : spawnSync(command, args, { cwd, stdio: 'inherit' })
  if (result.status !== 0) {
    console.error(`\nFalló: ${label}`)
    process.exit(result.status ?? 1)
  }
}

if (!hasVenv()) {
  run('Creando entorno virtual del backend', isWindows ? 'python' : 'python3', ['-m', 'venv', '.venv'], BACKEND)
}
run('Instalando dependencias del backend', VENV_PYTHON, ['-m', 'pip', 'install', '-r', 'requirements.txt'], BACKEND)
run('Aplicando migraciones', VENV_PYTHON, ['manage.py', 'migrate'], BACKEND)
run('Instalando dependencias del frontend', 'npm', ['install'], FRONTEND)

console.log('\nListo. Ejecuta "npm run dev" para iniciar el proyecto.')
