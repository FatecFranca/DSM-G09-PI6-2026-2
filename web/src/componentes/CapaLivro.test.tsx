import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { livro } from '../teste/fabricas'
import CapaLivro from './CapaLivro'

test('sem imagem desenha a capa generica com titulo, autor e cor do livro', () => {
  render(<CapaLivro livro={livro(3, 'Duna', { autores: 'Frank Herbert' })} />)

  const capa = screen.getByLabelText('Capa de Duna')
  expect(capa).toHaveTextContent('Duna')
  expect(capa).toHaveTextContent('Frank Herbert')
  expect(capa.style.backgroundColor).toBe('rgb(92, 56, 40)')
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
})

test('com imagem valida mostra a foto e volta para a capa generica se ela falhar', () => {
  render(<CapaLivro livro={livro(1, 'Duna', { imagem_capa: 'https://x/capa.jpg' })} />)

  const imagem = screen.getByRole('img', { name: 'Capa de Duna' })
  fireEvent.error(imagem)

  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Capa de Duna')).toHaveTextContent('Duna')
})

test('endereco de imagem que nao e http vira capa generica', () => {
  render(<CapaLivro livro={livro(1, 'Duna', { imagem_capa: 'javascript:x' })} />)
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
})

test('sem titulo e sem autor', () => {
  render(<CapaLivro livro={livro(1, '', { autores: null })} />)
  const capa = screen.getByLabelText('Capa de Sem título')
  expect(capa).toHaveTextContent('Sem título')
  expect(capa.querySelectorAll('span')).toHaveLength(1)
})
