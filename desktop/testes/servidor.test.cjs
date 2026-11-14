const { test, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const http = require('node:http')
const { iniciarServidor, resolverApi, cookieLocal } = require('../servidor.cjs')

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'nextread-desktop-'))
fs.mkdirSync(path.join(fixture, 'assets'))
fs.writeFileSync(path.join(fixture, 'index.html'), '<!doctype html><title>NextRead</title>')
fs.writeFileSync(path.join(fixture, 'assets', 'main.js'), 'console.log("ok")')
const upstream = http.createServer(async (req, res) => {
  if (req.url === '/auth/entrar') {
    let conteudo = ''
    for await (const p of req) conteudo += p
    res.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': 'nextread.session=abc; Path=/; HttpOnly; Secure; SameSite=None' })
    return res.end(JSON.stringify({ ok: conteudo.includes('senha'), csrf: req.headers['x-nextread-request'] }))
  }
  if (req.url === '/auth/me') {
    res.writeHead(req.headers.cookie?.includes('nextread.session=abc') ? 200 : 401, {'Content-Type': 'application/json'})
    return res.end(JSON.stringify({ cookie: req.headers.cookie || '' }))
  }
  if (req.url === '/livros?pagina=1') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{"livros":[]}') }
  res.writeHead(404).end()
})
let instancia
let origem
let portaUpstream

test('configuração rejeita API HTTP pública ou URL com credenciais', () => {
  assert.throws(() => resolverApi('http://api.example.com'))
  assert.throws(() => resolverApi('https://a:b@api.example.com'))
  assert.throws(() => resolverApi('https://api.example.com/path'))
  assert.equal(resolverApi('http://localhost:5267').port, '5267')
})

test('cookies ficam locais e continuam HttpOnly', () => {
  const c = cookieLocal('nextread.session=abc; Path=/; HttpOnly; Domain=onrender.com; SameSite=None; Secure')
  assert.match(c, /HttpOnly/)
  assert.match(c, /SameSite=Lax/)
  assert.doesNotMatch(c, /Domain=|Secure/i)
})

test('prepara servidores de teste', async () => {
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve))
  portaUpstream = upstream.address().port
  instancia = await iniciarServidor({ arquivos: fixture, apiUrl: `http://127.0.0.1:${portaUpstream}` })
  origem = instancia.origem
  assert.ok(origem.startsWith('http://127.0.0.1:'))
})

test('carrega página inicial e rotas do React, com CSP', async () => {
  for (const p of ['/', '/explorar', '/livro/42', '/biblioteca', '/recomendacoes']) {
    const r = await fetch(origem + p)
    assert.equal(r.status, 200, p)
    assert.match(await r.text(), /NextRead/)
    assert.match(r.headers.get('content-security-policy'), /script-src 'self'/)
  }
})

test('serve arquivos JS e não devolve HTML para assets ausentes', async () => {
  const script = await fetch(origem + '/assets/main.js')
  assert.equal(script.status, 200)
  assert.match(script.headers.get('content-type'), /javascript/)
  assert.equal((await fetch(origem + '/assets/naoexiste.js')).status, 404)
})

test('recusa origem e host indevidos', async () => {
  assert.equal((await fetch(origem + '/api/auth/me', { headers: { Origin:'https://evil.example' } })).status, 403)
  const status = await new Promise((resolve, reject) => {
    http.get(origem, { headers: { Host:'evil.example' } }, resposta => {
      resposta.resume()
      resolve(resposta.statusCode)
    }).on('error', reject)
  })
  assert.equal(status, 403)
})

test('faz proxy dos endpoints e dos parâmetros da API', async () => {
  const r = await fetch(origem + '/api/livros?pagina=1')
  assert.equal(r.status, 200)
  assert.deepEqual(await r.json(), {livros:[]})
})

test('permite login e passa a sessão pelo proxy', async () => {
  const r = await fetch(origem + '/api/auth/entrar', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'X-NextRead-Request':'1', Origin: origem },
    body: JSON.stringify({ email:'teste@example.com', senha:'senha123' }),
  })
  assert.equal(r.status, 200)
  assert.equal((await r.json()).csrf, '1')
  const sc = r.headers.get('set-cookie')
  assert.match(sc, /HttpOnly/)
  assert.doesNotMatch(sc, /Secure|SameSite=None/)
  const cookie = sc.split(';')[0]
  const me = await fetch(origem + '/api/auth/me', {headers:{Cookie:cookie}})
  assert.equal(me.status, 200)
  assert.match((await me.json()).cookie, /nextread.session=abc/)
})

test('bloqueia escrita que não é requisição para API', async () => {
  assert.equal((await fetch(origem + '/explorar', {method:'POST'})).status, 405)
})

after(async () => {
  if (instancia) await new Promise(resolve => instancia.servidor.close(resolve))
  if (upstream.listening) await new Promise(resolve => upstream.close(resolve))
  fs.rmSync(fixture, { recursive: true, force: true })
})
