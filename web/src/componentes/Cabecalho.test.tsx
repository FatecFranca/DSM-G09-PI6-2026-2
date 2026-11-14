import { screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { caminhosChamados, comoAna, renderizarApp } from '../teste/renderizar'

const rotasDaInicio = { 'GET /livros?pagina=1&tamanhoPagina=8': { itens: [], total: 0, pagina: 1, tamanho_pagina: 8, total_paginas: 0 } }

test('visitante ve a navegacao, o botao entrar e o rodape sem textos academicos', async () => {
  renderizarApp('/', rotasDaInicio)

  const navegacao = screen.getByRole('navigation', { name: 'Principal' })
  for (const nome of ['Início', 'Explorar', 'Minha biblioteca', 'Recomendações']) {
    expect(screen.getByRole('link', { name: nome })).toBeInTheDocument()
  }
  expect(navegacao).toBeInTheDocument()
  expect(await screen.findByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar')
  expect(screen.getByText('© 2026 NextRead')).toBeInTheDocument()
  expect(screen.getByText('Leituras parecidas com as que você gosta.')).toBeInTheDocument()
  expect(screen.queryByText(/Projeto Integrador/i)).not.toBeInTheDocument()
})

test('a pagina atual fica marcada na navegacao', () => {
  renderizarApp('/', rotasDaInicio)
  expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('link', { name: 'Explorar' })).not.toHaveAttribute('aria-current')
})

test('usuario logado ve o primeiro nome e consegue sair', async () => {
  const { chamadas, usuario } = renderizarApp('/', { ...rotasDaInicio, ...comoAna, 'POST /auth/sair': { status: 204 } })

  expect(await screen.findByText('Olá, Ana')).toBeInTheDocument()
  await usuario.click(screen.getByRole('button', { name: 'Sair' }))

  expect(await screen.findByRole('link', { name: 'Entrar' })).toBeInTheDocument()
  expect(caminhosChamados(chamadas)).toContain('POST /auth/sair')
})

test('sair com a sessao ja expirada tambem encerra no site', async () => {
  const alerta = vi.spyOn(window, 'alert').mockImplementation(() => {})
  const { usuario } = renderizarApp('/', { ...rotasDaInicio, ...comoAna, 'POST /auth/sair': { status: 401 } })

  await usuario.click(await screen.findByRole('button', { name: 'Sair' }))

  expect(await screen.findByRole('link', { name: 'Entrar' })).toBeInTheDocument()
  expect(alerta).not.toHaveBeenCalled()
})
