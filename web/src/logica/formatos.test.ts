import { expect, test } from 'vitest'
import { formatarContagem, formatarPreco, formatarPublicacao } from './formatos'

test('formatarPreco', () => {
  expect(formatarPreco(12.5)).toBe('US$ 12,50')
  expect(formatarPreco(null)).toBe('Não informado')
})

test('formatarPublicacao', () => {
  expect(formatarPublicacao('Janeiro', 2001)).toBe('Janeiro de 2001')
  expect(formatarPublicacao(null, 2001)).toBe('2001')
  expect(formatarPublicacao(null, null)).toBe('Não informada')
})

test('formatarContagem', () => {
  expect(formatarContagem(1, 'livro', 'livros')).toBe('1 livro')
  expect(formatarContagem(1234, 'livro', 'livros')).toBe('1.234 livros')
  expect(formatarContagem(0, 'livro', 'livros')).toBe('0 livros')
})
