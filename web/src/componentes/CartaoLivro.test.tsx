import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { expect, test } from 'vitest'
import { livro } from '../teste/fabricas'
import CartaoLivro from './CartaoLivro'

test('o cartao inteiro leva aos detalhes do livro', () => {
  render(
    <MemoryRouter>
      <CartaoLivro livro={livro(10, 'Duna', { autores: 'Frank Herbert', categoria: 'Ficção' })}>
        <button type="button">Remover</button>
      </CartaoLivro>
    </MemoryRouter>,
  )

  const link = screen.getByRole('link')
  expect(link).toHaveAttribute('href', '/livro/10')
  expect(within(link).getByRole('heading', { name: 'Duna' })).toBeInTheDocument()
  expect(link).toHaveTextContent('Frank Herbert')
  expect(link).toHaveTextContent('Ficção')
  expect(within(link).queryByRole('button')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Remover' })).toBeInTheDocument()
})

test('mostra textos padrao quando faltam categoria e autor', () => {
  render(
    <MemoryRouter>
      <CartaoLivro livro={livro(10, 'Duna', { autores: null, categoria: null })} />
    </MemoryRouter>,
  )
  expect(screen.getByRole('link')).toHaveTextContent('Sem categoria')
  expect(screen.getByRole('link')).toHaveTextContent('Autor desconhecido')
})
