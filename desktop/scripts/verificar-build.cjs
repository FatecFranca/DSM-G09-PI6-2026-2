const { existsSync } = require('node:fs')
const path = require('node:path')
const entrada = path.join(__dirname, '..', 'renderer', 'index.html')
if (!existsSync(entrada)) {
  console.error('A interface desktop ainda não foi preparada. Execute npm run dev ou npm run prepare:web.')
  process.exit(1)
}
