import { screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { livro, pagina } from '../teste/fabricas'
import { renderizarApp } from '../teste/renderizar'

const ROTA_DESTAQUES = 'GET /livros?pagina=1&tamanhoPagina=8'

test('apresenta o site e os livros reais do catalogo', async () => {
  renderizarApp('/', { [ROTA_DESTAQUES]: pagina([livro(10, 'LIVRO REAL 1'), livro(11, 'LIVRO REAL 2')]) })

  expect(screen.getByRole('heading', { level: 1, name: 'Seu próximo livro começa aqui.' })).toBeInTheDocument()
  expect(screen.getByText('Busque, guarde e descubra leituras parecidas com as que você gosta.')).toBeInTheDocument()

  const grade = await screen.findByRole('list', { name: 'Do catálogo' })
  const links = within(grade).getAllByRole('link')
  expect(links).toHaveLength(2)
  expect(links[0]).toHaveAttribute('href', '/livro/10')
  expect(screen.getByRole('heading', { level: 2, name: 'Do catálogo' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Ver todos' })).toHaveAttribute('href', '/explorar')
  expect(screen.queryByText('Descubra novas histórias')).not.toBeInTheDocument()
})

test('a busca leva ao explorar', async () => {
  const { usuario } = renderizarApp('/', { [ROTA_DESTAQUES]: pagina([]) })
  await usuario.type(screen.getByPlaceholderText('Título, autor ou categoria'), 'duna')
  await usuario.click(screen.getByRole('button', { name: 'Buscar' }))
  expect(await screen.findByRole('heading', { level: 1, name: 'Explorar' })).toBeInTheDocument()
})

test('catalogo vazio', async () => {
  renderizarApp('/', { [ROTA_DESTAQUES]: pagina([]) })
  expect(await screen.findByText('Ainda não há livros no catálogo.')).toBeInTheDocument()
})

test('api fora do ar', async () => {
  renderizarApp('/')
  expect(await screen.findByText('Não foi possível carregar o catálogo. Tente novamente em instantes.')).toBeInTheDocument()
})
