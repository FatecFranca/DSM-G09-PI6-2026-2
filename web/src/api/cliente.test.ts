import { describe, expect, test, vi } from 'vitest'
import { cabecalhos, criarFetchFalso } from '../teste/fetchFalso'
import { pagina } from '../teste/fabricas'
import { criarCliente, ErroApi, resolverBaseApi } from './cliente'

const BASE = 'http://api.teste'
const usuario = { id_usuario: 5, nome: 'Ana Souza', email: 'ana@teste.com', data_cadastro: '2026-11-01' }

function montar(rotas: Record<string, unknown>, tempoLimiteMs?: number) {
  const falso = criarFetchFalso(rotas)
  return { cliente: criarCliente(BASE, falso.fetch, tempoLimiteMs), chamadas: falso.chamadas }
}

describe('resolverBaseApi', () => {
  test('usa a api local quando o site roda em localhost', () => {
    expect(resolverBaseApi('localhost')).toBe('http://localhost:5267')
    expect(resolverBaseApi('127.0.0.1')).toBe('http://localhost:5267')
  })

  test('usa a api do render nos demais hosts', () => {
    expect(resolverBaseApi('nextread-frontend.onrender.com')).toBe('https://dsm-g09-pi6-2026-2.onrender.com')
  })

  test('prefere a variavel de ambiente e remove a barra final', () => {
    expect(resolverBaseApi('localhost', 'http://x:1/')).toBe('http://x:1')
  })
})

describe('requisicoes', () => {
  test('get de livros monta a query sem filtros vazios e sem cabecalhos de escrita', async () => {
    const { cliente, chamadas } = montar({
      'GET /livros?pagina=2&tamanhoPagina=12&busca=a+b&categoria=Fantasia': pagina([]),
      'GET /livros?pagina=1&tamanhoPagina=12': pagina([]),
    })

    await cliente.livros({ pagina: 2, tamanhoPagina: 12, busca: 'a b', categoria: 'Fantasia' })
    await cliente.livros({ pagina: 1, tamanhoPagina: 12, busca: '', categoria: '' })

    expect(chamadas).toHaveLength(2)
    expect(chamadas[0].init.credentials).toBe('include')
    expect(cabecalhos(chamadas[0]).get('X-NextRead-Request')).toBeNull()
    expect(cabecalhos(chamadas[0]).get('Content-Type')).toBeNull()
  })

  test('salvar envia o cabecalho de protecao sem content-type', async () => {
    const { cliente, chamadas } = montar({ 'POST /usuarios/5/livros-salvos/8': { status: 201, corpo: {} } })

    await cliente.salvar(5, 8)

    expect(cabecalhos(chamadas[0]).get('X-NextRead-Request')).toBe('1')
    expect(cabecalhos(chamadas[0]).get('Content-Type')).toBeNull()
  })

  test('entrar envia json com o cabecalho de protecao', async () => {
    const { cliente, chamadas } = montar({ 'POST /auth/entrar': usuario })

    expect(await cliente.entrar('a@b.com', '12345678')).toEqual(usuario)
    expect(cabecalhos(chamadas[0]).get('Content-Type')).toBe('application/json')
    expect(cabecalhos(chamadas[0]).get('X-NextRead-Request')).toBe('1')
    expect(chamadas[0].init.body).toBe('{"email":"a@b.com","senha":"12345678"}')
  })

  test('remover com 204 resolve sem corpo', async () => {
    const { cliente } = montar({ 'DELETE /usuarios/5/livros-salvos/8': { status: 204 } })
    await expect(cliente.remover(5, 8)).resolves.toBeUndefined()
  })

  test('me devolve null para visitante e o usuario quando logado', async () => {
    expect(await montar({ 'GET /auth/me': { status: 401 } }).cliente.me()).toBeNull()
    expect(await montar({ 'GET /auth/me': usuario }).cliente.me()).toEqual(usuario)
  })
})

describe('erros', () => {
  async function erroDe(resposta: unknown) {
    const { cliente } = montar({ 'GET /livros/1': resposta })
    return cliente.detalhe(1).catch((erro: unknown) => erro)
  }

  test('usa title, errors ou mensagem do corpo', async () => {
    const comTitulo = await erroDe({ status: 400, corpo: { title: 'Dados inválidos' } })
    expect(comTitulo).toBeInstanceOf(ErroApi)
    expect(comTitulo).toMatchObject({ message: 'Dados inválidos', status: 400 })

    expect(await erroDe({ status: 400, corpo: { errors: { Senha: ['Mínimo 8'] } } })).toMatchObject({ message: 'Mínimo 8' })
    expect(await erroDe({ status: 404, corpo: { mensagem: 'X' } })).toMatchObject({ message: 'X', status: 404 })
  })

  test('avisa quando a sessao expira numa requisicao que exige login', async () => {
    const { cliente } = montar({
      'POST /usuarios/5/livros-salvos/8': { status: 401 },
      'POST /auth/entrar': { status: 401, corpo: { mensagem: 'E-mail ou senha inválidos' } },
      'GET /auth/me': { status: 401 },
    })
    const expirou = vi.fn()
    cliente.aoExpirarSessao(expirou)

    await cliente.entrar('a@b.com', 'errada').catch(() => {})
    await cliente.me()
    expect(expirou).not.toHaveBeenCalled()

    await cliente.salvar(5, 8).catch(() => {})
    expect(expirou).toHaveBeenCalledTimes(1)
  })

  test('429 sem corpo pede para aguardar', async () => {
    expect(await erroDe({ status: 429 })).toMatchObject({ message: 'Muitas tentativas. Aguarde um minuto.', status: 429 })
  })

  test('falha de rede vira erro com status 0', async () => {
    const { cliente } = montar({})
    const erro = await cliente.detalhe(1).catch((e: unknown) => e)
    expect(erro).toBeInstanceOf(ErroApi)
    expect(erro).toMatchObject({ status: 0, message: 'Não foi possível conectar ao servidor. Tente novamente em instantes.' })
  })

  test('demora acima do limite vira erro com status 0', async () => {
    const { cliente } = montar({ 'GET /livros/1': { status: 200, corpo: {}, atrasoMs: 50 } }, 10)
    const erro = await cliente.detalhe(1).catch((e: unknown) => e)
    expect(erro).toMatchObject({ status: 0, message: 'O servidor demorou para responder. Tente novamente em instantes.' })
  })
})
