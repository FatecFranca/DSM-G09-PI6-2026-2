import { screen, waitFor, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import type { Detalhe } from '../api/tipos'
import { cabecalhos } from '../teste/fetchFalso'
import { livro } from '../teste/fabricas'
import { caminhosChamados, comoAna, renderizarApp } from '../teste/renderizar'

const detalhe: Detalhe = {
  ...livro(8, 'Duna', { autores: 'Frank Herbert', categoria: 'Ficção', mes_publicacao: 'Março', ano_publicacao: 2010, preco_inicial: 12.5 }),
  isbn: null,
  descricao: 'Uma história.',
  editora: 'Arqueiro',
  avaliacao_media: null,
}

const ROTA = { 'GET /livros/8': detalhe }

test('mostra os detalhes completos do livro', async () => {
  renderizarApp('/livro/8', ROTA)

  expect(await screen.findByRole('heading', { level: 1, name: 'Duna' })).toBeInTheDocument()
  expect(screen.getByText('por Frank Herbert')).toBeInTheDocument()
  expect(screen.getByText('Ficção')).toBeInTheDocument()
  expect(screen.getByText('Editora').nextElementSibling).toHaveTextContent('Arqueiro')
  expect(screen.getByText('Publicação').nextElementSibling).toHaveTextContent('Março de 2010')
  expect(screen.getByText('Preço inicial').nextElementSibling).toHaveTextContent('US$ 12,50')
  expect(screen.getByRole('heading', { level: 2, name: 'Descrição' })).toBeInTheDocument()
  expect(screen.getByText('Uma história.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Ver semelhantes' })).toHaveAttribute('href', '/recomendacoes?livro=8')
  expect(screen.queryByText('Sobre o livro')).not.toBeInTheDocument()
  await waitFor(() => expect(document.title).toBe('Duna · NextRead'))
})

test('livro sem descricao', async () => {
  renderizarApp('/livro/8', { 'GET /livros/8': { ...detalhe, descricao: null } })
  expect(await screen.findByText('Descrição não disponível.')).toBeInTheDocument()
})

test('id invalido nao consulta a api', async () => {
  const { chamadas } = renderizarApp('/livro/abc')
  expect(await screen.findByText('Livro não encontrado.')).toBeInTheDocument()
  expect(caminhosChamados(chamadas).filter(rota => rota.includes('/livros'))).toEqual([])
})

test('livro inexistente', async () => {
  renderizarApp('/livro/8', { 'GET /livros/8': { status: 404, corpo: { mensagem: 'Livro nao encontrado' } } })
  expect(await screen.findByText('Livro não encontrado.')).toBeInTheDocument()
})

test('erro ao carregar', async () => {
  renderizarApp('/livro/8')
  expect(await screen.findByText('Não foi possível carregar este livro. Tente novamente em instantes.')).toBeInTheDocument()
})

test('visitante e levado a entrar para salvar', async () => {
  renderizarApp('/livro/8', ROTA)
  expect(await screen.findByRole('link', { name: 'Entrar para salvar' })).toHaveAttribute(
    'href',
    '/entrar?retorno=%2Flivro%2F8',
  )
})

const salvoEm = (idLivro: number) => ({ id_salvo: 1, data_salvo: '2026-11-10T10:00:00Z', livro: livro(idLivro, 'Qualquer') })

test('livro que ja esta na biblioteca abre como salvo', async () => {
  renderizarApp('/livro/8', { ...ROTA, ...comoAna, 'GET /usuarios/5/livros-salvos': [salvoEm(3), salvoEm(8)] })
  expect(await screen.findByRole('button', { name: 'Salvo na biblioteca' })).toBeDisabled()
})

test('livro fora da biblioteca abre com o botao de salvar', async () => {
  renderizarApp('/livro/8', { ...ROTA, ...comoAna, 'GET /usuarios/5/livros-salvos': [salvoEm(3)] })
  await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar na biblioteca' })).toBeEnabled())
})

test('se a biblioteca nao puder ser consultada, ainda da para salvar', async () => {
  renderizarApp('/livro/8', { ...ROTA, ...comoAna })
  await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar na biblioteca' })).toBeEnabled())
})

test('usuario logado salva o livro na biblioteca', async () => {
  const { usuario, chamadas } = renderizarApp('/livro/8', {
    ...ROTA,
    ...comoAna,
    'GET /usuarios/5/livros-salvos': [],
    'POST /usuarios/5/livros-salvos/8': { status: 201, corpo: {} },
  })

  const botao = await screen.findByRole('button', { name: 'Salvar na biblioteca' })
  await waitFor(() => expect(botao).toBeEnabled())
  await usuario.click(botao)

  expect(await screen.findByRole('button', { name: 'Salvo na biblioteca' })).toBeInTheDocument()
  const post = chamadas.find(chamada => chamada.init.method === 'POST')!
  expect(cabecalhos(post).get('X-NextRead-Request')).toBe('1')
})

test('sessao expirada ao salvar', async () => {
  const { usuario } = renderizarApp('/livro/8', {
    ...ROTA,
    ...comoAna,
    'POST /usuarios/5/livros-salvos/8': { status: 401 },
  })

  await usuario.click(await screen.findByRole('button', { name: 'Salvar na biblioteca' }))

  expect(await screen.findByText('Sua sessão expirou. Entre novamente.')).toBeInTheDocument()
  expect(screen.queryByText('Olá, Ana')).not.toBeInTheDocument()

  await usuario.click(screen.getByRole('link', { name: 'Entrar para salvar' }))
  expect(await screen.findByRole('heading', { level: 1, name: 'Entrar no NextRead' })).toBeInTheDocument()
})

async function estrelas() {
  return within(await screen.findByRole('group', { name: 'Sua nota' }))
}

function pressionadas(grupo: ReturnType<typeof within>) {
  return grupo.getAllByRole('button', { name: /^Dar \d estrelas?$/ }).filter((botao: HTMLElement) => botao.getAttribute('aria-pressed') === 'true')
}

test('visitante nao ve as estrelas nem consulta a nota', async () => {
  const { chamadas } = renderizarApp('/livro/8', ROTA)
  await screen.findByRole('link', { name: 'Entrar para salvar' })
  expect(screen.queryByRole('group', { name: 'Sua nota' })).not.toBeInTheDocument()
  expect(caminhosChamados(chamadas).some(rota => rota.includes('/avaliacao'))).toBe(false)
})

test('usuario logado ve a nota que ja deu', async () => {
  renderizarApp('/livro/8', { ...ROTA, ...comoAna, 'GET /livros/8/avaliacao': { nota: 3 } })
  const grupo = await estrelas()
  await waitFor(() => expect(pressionadas(grupo)).toHaveLength(3))
  expect(grupo.getByRole('button', { name: 'Remover nota' })).toBeInTheDocument()
})

test('dar uma nota envia put e marca as estrelas', async () => {
  const { usuario, chamadas } = renderizarApp('/livro/8', {
    ...ROTA,
    ...comoAna,
    'GET /livros/8/avaliacao': { nota: null },
    'PUT /livros/8/avaliacao': { nota: 4 },
  })
  const grupo = await estrelas()
  expect(grupo.queryByRole('button', { name: 'Remover nota' })).not.toBeInTheDocument()

  await usuario.click(grupo.getByRole('button', { name: 'Dar 4 estrelas' }))

  await waitFor(() => expect(pressionadas(grupo)).toHaveLength(4))
  const put = chamadas.find(chamada => chamada.init.method === 'PUT')!
  expect(put.init.body).toBe('{"nota":4}')
  expect(cabecalhos(put).get('X-NextRead-Request')).toBe('1')
})

test('remover a nota envia delete e limpa as estrelas', async () => {
  const { usuario, chamadas } = renderizarApp('/livro/8', {
    ...ROTA,
    ...comoAna,
    'GET /livros/8/avaliacao': { nota: 5 },
    'DELETE /livros/8/avaliacao': { status: 204 },
  })
  const grupo = await estrelas()
  await usuario.click(await grupo.findByRole('button', { name: 'Remover nota' }))

  await waitFor(() => expect(pressionadas(grupo)).toHaveLength(0))
  expect(caminhosChamados(chamadas)).toContain('DELETE /livros/8/avaliacao')
})

test('falha ao salvar a nota mostra erro', async () => {
  const { usuario } = renderizarApp('/livro/8', {
    ...ROTA,
    ...comoAna,
    'GET /livros/8/avaliacao': { nota: null },
    'PUT /livros/8/avaliacao': { status: 500 },
  })
  const grupo = await estrelas()
  await usuario.click(grupo.getByRole('button', { name: 'Dar 2 estrelas' }))

  expect(await screen.findByText('Não foi possível salvar sua nota. Tente novamente.')).toBeInTheDocument()
  expect(pressionadas(grupo)).toHaveLength(0)
})
