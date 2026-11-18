import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const isWindows = process.platform === 'win32'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const BACKEND = join(ROOT, 'backend')
export const FRONTEND = join(ROOT, 'frontend')

// python del entorno virtual del backend
export const VENV_PYTHON = isWindows
  ? join(BACKEND, '.venv', 'Scripts', 'python.exe')
  : join(BACKEND, '.venv', 'bin', 'python')

export const hasVenv = () => existsSync(VENV_PYTHON)
export const hasNodeModules = () => existsSync(join(FRONTEND, 'node_modules'))
