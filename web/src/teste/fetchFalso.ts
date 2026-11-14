import { vi } from 'vitest'

export interface RespostaFalsa {
  status: number
  corpo?: unknown
  atrasoMs?: number
}

export interface Chamada {
  url: string
  init: RequestInit
}

function ehRespostaFalsa(valor: unknown): valor is RespostaFalsa {
  return typeof valor === 'object' && valor !== null && 'status' in valor && typeof valor.status === 'number'
}

function esperar(ms: number, sinal?: AbortSignal | null) {
  return new Promise<void>((resolver, rejeitar) => {
    const temporizador = setTimeout(resolver, ms)
    sinal?.addEventListener('abort', () => {
      clearTimeout(temporizador)
      rejeitar(new DOMException('abortado', 'AbortError'))
    })
  })
}

// chave da rota: "METODO /caminho?query", por exemplo "GET /livros/8"
export function criarFetchFalso(rotas: Record<string, unknown>) {
  const chamadas: Chamada[] = []

  const fetchFalso = async (entrada: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(entrada))
    const metodo = (init.method ?? 'GET').toUpperCase()
    chamadas.push({ url: url.pathname + url.search, init: { ...init, method: metodo } })

    const chave = `${metodo} ${url.pathname}${url.search}`
    if (!Object.hasOwn(rotas, chave)) throw new TypeError('Failed to fetch')

    const valor = rotas[chave]
    const resposta: RespostaFalsa = ehRespostaFalsa(valor) ? valor : { status: 200, corpo: valor }
    if (resposta.atrasoMs) await esperar(resposta.atrasoMs, init.signal)

    const temCorpo = resposta.corpo !== undefined && resposta.status !== 204
    return new Response(temCorpo ? JSON.stringify(resposta.corpo) : null, {
      status: resposta.status,
      headers: temCorpo ? { 'Content-Type': 'application/json' } : {},
    })
  }

  return { fetch: fetchFalso as typeof fetch, chamadas }
}

export function instalarFetchFalso(rotas: Record<string, unknown>) {
  const { fetch, chamadas } = criarFetchFalso(rotas)
  vi.stubGlobal('fetch', vi.fn(fetch))
  return chamadas
}

export function cabecalhos(chamada: Chamada) {
  return new Headers(chamada.init.headers)
}
