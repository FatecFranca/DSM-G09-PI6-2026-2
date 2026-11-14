import { expect, test } from 'vitest'
import { CORES_DE_CAPA, corDaCapa } from './capa'

test('as cores da capa sao as tres da identidade', () => {
  expect(CORES_DE_CAPA).toEqual(['#5C3828', '#7A5038', '#4A2C1F'])
})

test('o mesmo livro sempre recebe a mesma cor e livros vizinhos recebem cores diferentes', () => {
  expect(corDaCapa(7)).toBe(corDaCapa(7))
  expect(new Set([corDaCapa(1), corDaCapa(2), corDaCapa(3)]).size).toBe(3)
  expect(corDaCapa(3)).toBe('#5C3828')
})
