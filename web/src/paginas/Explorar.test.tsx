import { screen, waitFor, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { livro, pagina } from '../teste/fabricas'
import { caminhosChamados, renderizarApp } from '../teste/renderizar'

const CATEGORIAS = {
  'GET /categorias?limite=500': [
    { categoria: 'Fantasia', total_livros: 10 },
    { categoria: 'História', total_livros: 4 },
  ],
}

function resultado(titulo: string, extra = {}) {
  return pagina([livro(1, titulo)], { total: 1234, pagina: 2, tamanho_pagina: 12, total_paginas: 103, ...extra })
}

test('le os filtros da url e mostra contador e paginacao', async () => {
  const { chamadas } = renderizarApp('/explorar?busca=duna&categoria=Fantasia&pagina=2', {
    ...CATEGORIAS,
    'GET /livros?pagina=2&tamanhoPagina=12&busca=duna&categoria=Fantasia': resultado('Duna'),
  })

  expect(screen.getByRole('heading', { level: 1, name: 'Explorar' })).toBeInTheDocument()
  expect(screen.getByRole('searchbox', { name: 'Buscar livros' })).toHaveValue('duna')
  expect(await screen.findByText('1.234 livros')).toBeInTheDocument()
  expect(screen.getByText('Página 2 de 103')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled()
  expect(screen.getByRole('button', { name: 'Próxima' })).toBeEnabled()
  expect(caminhosChamados(chamadas)).toContain('GET /categorias?limite=500')
  for (const antigo of ['Aplicar filtros', 'Resultados', 'Livros encontrados']) {
    expect(screen.queryByText(antigo)).not.toBeInTheDocument()
  }
})

test('trocar a categoria busca de novo a partir da primeira pagina', async () => {
  const { usuario, chamadas } = renderizarApp('/explorar?pagina=3', {
    ...CATEGORIAS,
    'GET /livros?pagina=3&tamanhoPagina=12': resultado('Primeiro', { pagina: 3 }),
    'GET /livros?pagina=1&tamanhoPagina=12&categoria=Fantasia': resultado('Fantasia', { pagina: 1, total_paginas: 1 }),
  })

  const seletor = await screen.findByRole('combobox', { name: 'Categoria' })
  expect(within(seletor).getAllByRole('option')[0]).toHaveTextContent('Todas as categorias')
  await screen.findByRole('option', { name: 'Fantasia' })
  await usuario.selectOptions(seletor, 'Fantasia')

  expect(await screen.findByRole('heading', { level: 3, name: 'Fantasia' })).toBeInTheDocument()
  expect(caminhosChamados(chamadas)).toContain('GET /livros?pagina=1&tamanhoPagina=12&categoria=Fantasia')
  expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled()
})

test('proxima pagina', async () => {
  const { usuario } = renderizarApp('/explorar', {
    ...CATEGORIAS,
    'GET /livros?pagina=1&tamanhoPagina=12': resultado('Um', { pagina: 1 }),
    'GET /livros?pagina=2&tamanhoPagina=12': resultado('Dois'),
  })

  await screen.findByRole('heading', { level: 3, name: 'Um' })
  expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
  await usuario.click(screen.getByRole('button', { name: 'Próxima' }))
  expect(await screen.findByRole('heading', { level: 3, name: 'Dois' })).toBeInTheDocument()
})

test('resposta antiga nao sobrescreve a busca mais recente', async () => {
  const { usuario } = renderizarApp('/explorar', {
    ...CATEGORIAS,
    'GET /livros?pagina=1&tamanhoPagina=12': { status: 200, corpo: resultado('ANTIGO', { pagina: 1 }), atrasoMs: 80 },
    'GET /livros?pagina=1&tamanhoPagina=12&busca=novo': resultado('NOVO', { pagina: 1 }),
  })

  await usuario.type(screen.getByRole('searchbox', { name: 'Buscar livros' }), 'novo')
  await usuario.click(screen.getByRole('button', { name: 'Buscar' }))

  expect(await screen.findByRole('heading', { level: 3, name: 'NOVO' })).toBeInTheDocument()
  await new Promise(resolver => setTimeout(resolver, 120))
  expect(screen.queryByRole('heading', { level: 3, name: 'ANTIGO' })).not.toBeInTheDocument()
})

test('a paginacao so aparece depois que os livros carregam', async () => {
  renderizarApp('/explorar', {
    ...CATEGORIAS,
    'GET /livros?pagina=1&tamanhoPagina=12': { status: 200, corpo: resultado('Lento', { pagina: 1 }), atrasoMs: 50 },
  })
  expect(screen.getByText('Carregando...')).toBeInTheDocument()
  expect(screen.queryByRole('navigation', { name: 'Paginação' })).not.toBeInTheDocument()
  expect(await screen.findByRole('navigation', { name: 'Paginação' })).toBeInTheDocument()
})

test('nenhum resultado', async () => {
  renderizarApp('/explorar', { ...CATEGORIAS, 'GET /livros?pagina=1&tamanhoPagina=12': pagina([], { total_paginas: 0 }) })
  expect(await screen.findByText('Nenhum livro encontrado.')).toBeInTheDocument()
})

test('catalogo fora do ar, mesmo com categorias funcionando', async () => {
  renderizarApp('/explorar', CATEGORIAS)
  expect(await screen.findByText('Não foi possível carregar o catálogo. Tente novamente em instantes.')).toBeInTheDocument()
})

test('categorias fora do ar nao impedem a lista', async () => {
  renderizarApp('/explorar', { 'GET /livros?pagina=1&tamanhoPagina=12': resultado('Livre', { pagina: 1 }) })
  expect(await screen.findByRole('heading', { level: 3, name: 'Livre' })).toBeInTheDocument()
  await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1))
})
