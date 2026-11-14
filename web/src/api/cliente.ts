import type { Categoria, Detalhe, Pagina, Recomendacoes, Salvo, Usuario } from './tipos'

const API_LOCAL = 'http://localhost:5267'
const API_PRODUCAO = 'https://dsm-g09-pi6-2026-2.onrender.com'
const METODOS_DE_ESCRITA = ['POST', 'PUT', 'PATCH', 'DELETE']
const ROTAS_SEM_SESSAO = ['/auth/me', '/auth/entrar', '/auth/cadastro']

export class ErroApi extends Error {
  status: number

  constructor(mensagem: string, status: number) {
    super(mensagem)
    this.name = 'ErroApi'
    this.status = status
  }
}

export function resolverBaseApi(hostname: string, variavel?: string): string {
  const base = variavel?.trim() || (['localhost', '127.0.0.1'].includes(hostname) ? API_LOCAL : API_PRODUCAO)
  return base.replace(/\/+$/, '')
}

interface CorpoDeErro {
  title?: string
  mensagem?: string
  errors?: Record<string, string[]>
}

function mensagemDeErro(corpo: CorpoDeErro | null, status: number): string {
  const validacao = Object.values(corpo?.errors ?? {}).flat().join('\n')
  if (validacao) return validacao
  if (corpo?.title) return corpo.title
  if (corpo?.mensagem) return corpo.mensagem
  if (status === 429) return 'Muitas tentativas. Aguarde um minuto.'
  return 'Não foi possível concluir a operação. Tente novamente em instantes.'
}

async function lerCorpo(resposta: Response): Promise<unknown> {
  const tipo = resposta.headers.get('content-type') ?? ''
  if (resposta.status === 204 || !tipo.includes('json')) return null
  return resposta.json()
}

export interface FiltroLivros {
  pagina: number
  tamanhoPagina: number
  busca?: string
  categoria?: string
}

export function criarCliente(
  base: string,
  transportar: typeof fetch = (...argumentos) => fetch(...argumentos),
  tempoLimiteMs = 45000,
) {
  let quandoSessaoExpirar = () => {}

  async function requisitar<T>(caminho: string, metodo = 'GET', dados?: unknown): Promise<T> {
    const cabecalhos: Record<string, string> = { Accept: 'application/json' }
    if (dados !== undefined) cabecalhos['Content-Type'] = 'application/json'
    if (METODOS_DE_ESCRITA.includes(metodo)) cabecalhos['X-NextRead-Request'] = '1'

    const controle = new AbortController()
    const temporizador = setTimeout(() => controle.abort(), tempoLimiteMs)
    try {
      const resposta = await transportar(base + caminho, {
        method: metodo,
        credentials: 'include',
        headers: cabecalhos,
        signal: controle.signal,
        ...(dados === undefined ? {} : { body: JSON.stringify(dados) }),
      })
      const corpo = await lerCorpo(resposta).catch(() => null)
      // 401 em /auth/me e /auth/entrar e normal (visitante ou senha errada), nos demais a sessao caiu
      if (resposta.status === 401 && !ROTAS_SEM_SESSAO.includes(caminho)) quandoSessaoExpirar()
      if (!resposta.ok) throw new ErroApi(mensagemDeErro(corpo as CorpoDeErro | null, resposta.status), resposta.status)
      return (corpo ?? undefined) as T
    } catch (erro) {
      if (erro instanceof ErroApi) throw erro
      throw new ErroApi(
        controle.signal.aborted
          ? 'O servidor demorou para responder. Tente novamente em instantes.'
          : 'Não foi possível conectar ao servidor. Tente novamente em instantes.',
        0,
      )
    } finally {
      clearTimeout(temporizador)
    }
  }

  return {
    aoExpirarSessao(funcao: () => void) {
      quandoSessaoExpirar = funcao
    },
    async me(): Promise<Usuario | null> {
      try {
        return await requisitar<Usuario>('/auth/me')
      } catch (erro) {
        if (erro instanceof ErroApi && erro.status === 401) return null
        throw erro
      }
    },
    entrar: (email: string, senha: string) => requisitar<Usuario>('/auth/entrar', 'POST', { email, senha }),
    cadastrar: (nome: string, email: string, senha: string) =>
      requisitar<Usuario>('/auth/cadastro', 'POST', { nome, email, senha }),
    sair: () => requisitar<void>('/auth/sair', 'POST'),
    livros({ pagina, tamanhoPagina, busca, categoria }: FiltroLivros) {
      const parametros = new URLSearchParams({ pagina: String(pagina), tamanhoPagina: String(tamanhoPagina) })
      if (busca?.trim()) parametros.set('busca', busca.trim())
      if (categoria) parametros.set('categoria', categoria)
      return requisitar<Pagina>(`/livros?${parametros}`)
    },
    categorias: () => requisitar<Categoria[]>('/categorias?limite=500'),
    detalhe: (id: number) => requisitar<Detalhe>(`/livros/${id}`),
    recomendacoes: (id: number) => requisitar<Recomendacoes>(`/livros/${id}/recomendacoes?total=12`),
    salvos: (idUsuario: number) => requisitar<Salvo[]>(`/usuarios/${idUsuario}/livros-salvos`),
    salvar: (idUsuario: number, idLivro: number) =>
      requisitar<Salvo>(`/usuarios/${idUsuario}/livros-salvos/${idLivro}`, 'POST'),
    remover: (idUsuario: number, idLivro: number) =>
      requisitar<void>(`/usuarios/${idUsuario}/livros-salvos/${idLivro}`, 'DELETE'),
  }
}

export type ClienteApi = ReturnType<typeof criarCliente>

export const api: ClienteApi = criarCliente(resolverBaseApi(location.hostname, import.meta.env.VITE_API_URL))
