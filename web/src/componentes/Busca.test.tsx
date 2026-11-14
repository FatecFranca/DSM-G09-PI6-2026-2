import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { expect, test, vi } from 'vitest'
import Busca from './Busca'

function LocalAtual() {
  const { pathname, search } = useLocation()
  return <p>local: {pathname + search}</p>
}

function renderizar(aoBuscar?: (termo: string) => void) {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Busca aoBuscar={aoBuscar} />} />
        <Route path="/explorar" element={<LocalAtual />} />
      </Routes>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

test('avisa o termo sem espacos nas pontas', async () => {
  const aoBuscar = vi.fn()
  const usuario = renderizar(aoBuscar)

  await usuario.type(screen.getByPlaceholderText('Título, autor ou categoria'), '  duna ')
  await usuario.click(screen.getByRole('button', { name: 'Buscar' }))

  expect(aoBuscar).toHaveBeenCalledWith('duna')
})

test('sem aoBuscar leva ao explorar com o termo', async () => {
  const usuario = renderizar()
  await usuario.type(screen.getByRole('searchbox', { name: 'Buscar livros' }), 'duna')
  await usuario.click(screen.getByRole('button', { name: 'Buscar' }))
  expect(screen.getByText('local: /explorar?busca=duna')).toBeInTheDocument()
})

test('termo vazio leva ao explorar sem filtro', async () => {
  const usuario = renderizar()
  await usuario.click(screen.getByRole('button', { name: 'Buscar' }))
  expect(screen.getByText('local: /explorar')).toBeInTheDocument()
})
