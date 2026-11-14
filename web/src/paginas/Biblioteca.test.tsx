import { screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import type { Salvo } from '../api/tipos'
import { cabecalhos } from '../teste/fetchFalso'
import { livro } from '../teste/fabricas'
import { caminhosChamados, comoAna, renderizarApp } from '../teste/renderizar'

const salvos: Salvo[] = [
  { id_salvo: 1, data_salvo: '2026-11-10T10:00:00Z', livro: livro(21, 'Duna', { categoria: 'Ficção' }) },
  { id_salvo: 2, data_salvo: '2026-11-12T10:00:00Z', livro: livro(22, 'Atlas', { categoria: 'Mapas' }) },
  { id_salvo: 3, data_salvo: '2026-11-01T10:00:00Z', livro: livro(23, 'Cosmos', { categoria: 'Ficção' }) },
]

const ROTAS = { ...comoAna, 'GET /usuarios/5/livros-salvos': salvos }

async function titulosNaTela() {
  const grade = await screen.findByRole('list', { name: 'Livros salvos' })
  return within(grade).getAllByRole('heading', { level: 3 }).map(titulo => titulo.textContent)
}

test('visitante e convidado a entrar', async () => {
  const { chamadas } = renderizarApp('/biblioteca')
  expect(await screen.findByText('Entre na sua conta para ver sua biblioteca.')).toBeInTheDocument()
  expect(screen.getAllByRole('link', { name: 'Entrar' }).at(-1)).toHaveAttribute('href', '/entrar?retorno=%2Fbiblioteca')
  expect(caminhosChamados(chamadas).some(rota => rota.includes('/usuarios/'))).toBe(false)
})

test('mostra o resumo e ordena do mais recente por padrao', async () => {
  renderizarApp('/biblioteca', ROTAS)
  expect(screen.getByRole('heading', { level: 1, name: 'Minha biblioteca' })).toBeInTheDocument()
  expect(await titulosNaTela()).toEqual(['Atlas', 'Duna', 'Cosmos'])
  expect(screen.getByText('3 livros · 2 categorias')).toBeInTheDocument()
  expect(screen.queryByText('Continue explorando')).not.toBeInTheDocument()
  expect(screen.queryByText('Sua biblioteca pessoal')).not.toBeInTheDocument()
})

test('muda a ordenacao', async () => {
  const { usuario } = renderizarApp('/biblioteca', ROTAS)
  await titulosNaTela()
  const ordem = screen.getByRole('combobox', { name: 'Ordenar' })

  await usuario.selectOptions(ordem, 'Mais antigos')
  expect(await titulosNaTela()).toEqual(['Cosmos', 'Duna', 'Atlas'])
  await usuario.selectOptions(ordem, 'Título A–Z')
  expect(await titulosNaTela()).toEqual(['Atlas', 'Cosmos', 'Duna'])
  await usuario.selectOptions(ordem, 'Título Z–A')
  expect(await titulosNaTela()).toEqual(['Duna', 'Cosmos', 'Atlas'])
})

test('busca sem diferenciar maiusculas', async () => {
  const { usuario } = renderizarApp('/biblioteca', ROTAS)
  await titulosNaTela()
  const campo = screen.getByRole('searchbox', { name: 'Buscar na biblioteca' })

  await usuario.type(campo, 'FICÇÃO')
  expect(await titulosNaTela()).toEqual(['Duna', 'Cosmos'])

  await usuario.clear(campo)
  await usuario.type(campo, 'xyz')
  expect(screen.getByText('Nenhum livro encontrado.')).toBeInTheDocument()
})

test('remove um livro', async () => {
  const { usuario, chamadas } = renderizarApp('/biblioteca', { ...ROTAS, 'DELETE /usuarios/5/livros-salvos/21': { status: 204 } })
  await titulosNaTela()

  await usuario.click(screen.getByRole('button', { name: 'Remover Duna' }))

  expect(await titulosNaTela()).toEqual(['Atlas', 'Cosmos'])
  expect(screen.getByText('2 livros · 2 categorias')).toBeInTheDocument()
  const remocao = chamadas.find(chamada => chamada.init.method === 'DELETE')!
  expect(cabecalhos(remocao).get('X-NextRead-Request')).toBe('1')
})

test('sessao expirada ao remover', async () => {
  const { usuario } = renderizarApp('/biblioteca', { ...ROTAS, 'DELETE /usuarios/5/livros-salvos/21': { status: 401 } })
  await titulosNaTela()

  await usuario.click(screen.getByRole('button', { name: 'Remover Duna' }))

  expect(await screen.findByText(/Sua sessão expirou. Entre novamente./)).toBeInTheDocument()
  expect(screen.queryByText('Olá, Ana')).not.toBeInTheDocument()
  expect(screen.getAllByRole('link', { name: 'Entrar' }).at(-1)).toHaveAttribute('href', '/entrar?retorno=%2Fbiblioteca')
})

test('sessao expirada ao abrir a biblioteca', async () => {
  renderizarApp('/biblioteca', { ...comoAna, 'GET /usuarios/5/livros-salvos': { status: 401 } })
  expect(await screen.findByText(/Sua sessão expirou. Entre novamente./)).toBeInTheDocument()
})

test('biblioteca vazia', async () => {
  renderizarApp('/biblioteca', { ...comoAna, 'GET /usuarios/5/livros-salvos': [] })
  expect(await screen.findByText('Sua biblioteca está vazia.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Explorar livros' })).toHaveAttribute('href', '/explorar')
})

test('erro ao carregar', async () => {
  renderizarApp('/biblioteca', comoAna)
  expect(await screen.findByText('Não foi possível carregar sua biblioteca. Tente novamente em instantes.')).toBeInTheDocument()
})
