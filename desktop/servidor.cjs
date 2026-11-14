// Servidor loopback para os arquivos locais do React e proxy HTTP para a API ASP.NET.
// Não é uma API nova: todos os endpoints /api/* são encaminhados à API já existente.
'use strict'
const http = require('node:http')
const https = require('node:https')
const fs = require('node:fs')
const path = require('node:path')

const API_PADRAO = 'https://dsm-g09-pi6-2026-2.onrender.com'
const MIMES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.map': 'application/json',
}
const CSP = [
  "default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'",
  "script-src 'self'", "style-src 'self' 'unsafe-inline'", "font-src 'self' data:",
  "img-src 'self' data: https: http:", "connect-src 'self'", "form-action 'self'",
].join('; ')

function resolverApi(endereco = process.env.NEXTREAD_API_URL || API_PADRAO) {
  const u = new URL(endereco)
  const local = ['localhost', '127.0.0.1'].includes(u.hostname)
  if ((u.protocol !== 'https:' && !(u.protocol === 'http:' && local)) || u.username || u.password ||
      u.search || u.hash || !['', '/'].includes(u.pathname)) {
    throw new Error('NEXTREAD_API_URL deve ser uma origem HTTPS ou HTTP localhost sem caminho, senha ou parâmetros.')
  }
  return u
}

function cookieLocal(valor) {
  // Sessões Secure/SameSite=None da API HTTPS precisam de atributos para a origem HTTP local.
  // A aplicação é servida APENAS em 127.0.0.1 e os cookies permanecem HttpOnly.
  return valor.split(';').map((atributo, i) => atributo.trim())
    .filter((parte, i) => i === 0 || !/^(secure|domain)=?/i.test(parte))
    .map(parte => /^samesite=/i.test(parte) ? 'SameSite=Lax' : parte)
    .join('; ')
}

function iniciarServidor({ arquivos, apiUrl = resolverApi(), porta = 0 } = {}) {
  if (!arquivos) throw new Error('É necessário informar a pasta renderer.')
  const raiz = path.resolve(arquivos)
  const destino = apiUrl instanceof URL ? apiUrl : resolverApi(apiUrl)
  const transportador = destino.protocol === 'https:' ? https : http
  const servidor = http.createServer((req, res) => {
    const host = req.headers.host
    const origemEsperada = `http://127.0.0.1:${servidor.address().port}`
    if (host !== `127.0.0.1:${servidor.address().port}` ||
        (req.headers.origin && req.headers.origin !== origemEsperada)) {
      res.writeHead(403).end('Origem não permitida')
      return
    }
    let url
    try { url = new URL(req.url, origemEsperada) }
    catch { res.writeHead(400).end('URL inválida'); return }
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api') { res.writeHead(404).end(); return }
      const nome = url.pathname.slice(4) + url.search
      const cabecalhos = { ...req.headers }
      delete cabecalhos.host
      delete cabecalhos.connection
      delete cabecalhos.origin
      delete cabecalhos.referer
      delete cabecalhos['sec-fetch-site']
      delete cabecalhos['sec-fetch-mode']
      delete cabecalhos['sec-fetch-dest']
      const proxied = transportador.request(destino, {
        method: req.method,
        path: nome,
        headers: cabecalhos,
        timeout: 60_000,
      }, upstream => {
        const headers = { ...upstream.headers }
        delete headers['access-control-allow-origin']
        delete headers['access-control-allow-credentials']
        if (headers['set-cookie']) headers['set-cookie'] = headers['set-cookie'].map(cookieLocal)
        res.writeHead(upstream.statusCode || 502, headers)
        upstream.pipe(res)
      })
      proxied.on('timeout', () => proxied.destroy(new Error('Tempo limite da API excedido')))
      proxied.on('error', () => {
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ mensagem: 'Não foi possível acessar a API NextRead.' }))
        } else res.destroy()
      })
      req.pipe(proxied)
      return
    }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return }
    let decoded
    try { decoded = decodeURIComponent(url.pathname) }
    catch { res.writeHead(400).end('Caminho inválido'); return }
    if (decoded.includes('\\') || decoded.includes('\0') || decoded.split('/').includes('..')) {
      res.writeHead(403).end('Acesso negado')
      return
    }
    const relativo = decoded.replace(/^\/+/, '')
    const arquivo = path.resolve(raiz, relativo || 'index.html')
    if (!arquivo.startsWith(raiz + path.sep) && arquivo !== raiz) {
      res.writeHead(403).end('Acesso negado')
      return
    }
    const cabe = {
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': CSP,
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': 'no-store',
    }
    let servido = arquivo
    try { if (!fs.statSync(servido).isFile()) servido = path.join(raiz, 'index.html') }
    catch {
      if (path.extname(relativo)) { res.writeHead(404, cabe).end('Arquivo não encontrado'); return }
      servido = path.join(raiz, 'index.html') // Rotas do React Router
    }
    if (!fs.existsSync(servido)) { res.writeHead(404, cabe).end('A interface web ainda não foi compilada'); return }
    cabe['Content-Type'] = MIMES[path.extname(servido)] || 'application/octet-stream'
    if (req.method === 'HEAD') { res.writeHead(200, cabe).end(); return }
    res.writeHead(200, cabe)
    fs.createReadStream(servido).on('error', () => res.destroy()).pipe(res)
  })
  return new Promise((resolve, reject) => {
    servidor.once('error', reject)
    servidor.listen(porta, '127.0.0.1', () => {
      servidor.removeListener('error', reject)
      resolve({ servidor, origem: `http://127.0.0.1:${servidor.address().port}` })
    })
  })
}

module.exports = { iniciarServidor, resolverApi, cookieLocal }
