import { screen, waitFor } from '@testing-library/react'
import { expect, test } from 'vitest'
import { renderizarApp } from './teste/renderizar'

test('links antigos .html abrem a pagina nova equivalente', async () => {
  renderizarApp('/salvos.html')
  expect(await screen.findByRole('heading', { level: 1, name: 'Minha biblioteca' })).toBeInTheDocument()
})

test('a busca antiga leva ao explorar', async () => {
  renderizarApp('/pesquisa.html?busca=duna')
  expect(await screen.findByRole('heading', { level: 1, name: 'Explorar' })).toBeInTheDocument()
})

test('caminho desconhecido mostra pagina nao encontrada', () => {
  renderizarApp('/nao-existe')
  expect(screen.getByText('Página não encontrada.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Voltar ao início' })).toHaveAttribute('href', '/')
})

test('o titulo da aba acompanha a pagina', async () => {
  renderizarApp('/explorar')
  await waitFor(() => expect(document.title).toBe('Explorar · NextRead'))
})
