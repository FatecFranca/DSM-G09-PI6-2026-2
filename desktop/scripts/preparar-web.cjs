// Empacota exatamente o React/Vite da Sprint 3, sem alterar ou procurar API_BASE.
const { spawnSync } = require('node:child_process')
const { cpSync, existsSync, mkdirSync, rmSync } = require('node:fs')
const path = require('node:path')
const raiz = path.resolve(__dirname, '..', '..')
const web = path.join(raiz, 'web')
const dist = path.join(web, 'dist')
const destino = path.join(raiz, 'desktop', 'renderer')
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'

if (!existsSync(path.join(web, 'node_modules'))) {
  console.error('Faltam as dependências do site. Execute: cd web && npm ci')
  process.exit(1)
}
// VITE_API_URL deve ser relativo para acessar o proxy local dentro do Electron.
const result = spawnSync(npm, ['run', 'build'], {
  cwd: web,
  stdio: 'inherit',
  env: { ...process.env, VITE_API_URL: '/api' },
  shell: process.platform === 'win32',
})
if (result.error || result.status !== 0) {
  console.error('Falha ao compilar o frontend:', result.error?.message || result.status)
  process.exit(result.status || 1)
}
if (!existsSync(path.join(dist, 'index.html'))) {
  console.error('Build web não gerou web/dist/index.html')
  process.exit(1)
}
rmSync(destino, { force: true, recursive: true })
mkdirSync(destino, { recursive: true })
cpSync(dist, destino, { recursive: true })
console.log('Interface atualizada copiada de web/dist para desktop/renderer.')
