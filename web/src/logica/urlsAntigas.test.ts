import { expect, test } from 'vitest'
import { converterUrlAntiga } from './urlsAntigas'

test.each([
  ['/index.html', '', '/'],
  ['/pesquisa.html', '?busca=duna', '/explorar?busca=duna'],
  ['/pesquisa.html', '', '/explorar'],
  ['/livro.html', '?id=5', '/livro/5'],
  ['/livro.html', '?id=abc', '/explorar'],
  ['/recomendacoes.html', '?id=7', '/recomendacoes?livro=7'],
  ['/recomendacoes.html', '', '/recomendacoes'],
  ['/salvos.html', '', '/biblioteca'],
  ['/login.html', '?retorno=salvos.html', '/entrar?retorno=%2Fbiblioteca'],
  ['/login.html', '', '/entrar'],
])('%s%s vira %s', (caminho, busca, esperado) => {
  expect(converterUrlAntiga(caminho, busca)).toBe(esperado)
})

test('caminho desconhecido nao e convertido', () => {
  expect(converterUrlAntiga('/qualquer', '')).toBeNull()
})
