import { expect, test } from 'vitest'
import { destinoSeguro } from './retorno'

test('aceita caminhos internos', () => {
  expect(destinoSeguro('/livro/5')).toBe('/livro/5')
  expect(destinoSeguro('/explorar?busca=x')).toBe('/explorar?busca=x')
})

test('recusa caminhos externos ou invalidos', () => {
  for (const invalido of [null, '', '//mal.com', 'https://mal.com', 'javascript:alert(1)', 'livro/5', '/\\mal.com', '/\t/mal.com', '/\n/mal.com', '/\r//mal.com']) {
    expect(destinoSeguro(invalido)).toBe('/biblioteca')
  }
})

test('usa o padrao informado', () => {
  expect(destinoSeguro('x', '/')).toBe('/')
})
