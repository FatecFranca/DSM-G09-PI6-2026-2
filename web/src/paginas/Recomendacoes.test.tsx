import { screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import type { Salvo } from '../api/tipos'
import { livro } from '../teste/fabricas'
import { caminhosChamados, comoAna, renderizarApp } from '../teste/renderizar'

const detalhe = (id: number, titulo: string) => ({ ...livro(id, titulo), isbn: null, descricao: null, editora: null, avaliacao_media: null })
const salvo = (id: number, titulo: string, dia = 1): Salvo => ({
  id_salvo: id,
  data_salvo: `2026-11-${String(dia).padStart(2, '0')}T10:00:00Z`,
  livro: livro(id, titulo),
})

async function cartoes() {
  const grade = await screen.findByRole('list', { name: 'Recomendações' })
  return within(grade).getAllByRole('listitem')
}

test('cabecalho curto, sem a secao antiga de como funciona', () => {
  renderizarApp('/recomendacoes')
  expect(screen.getByRole('heading', { level: 1, name: 'Recomendações' })).toBeInTheDocument()
  expect(
    screen.getByText('Sugestões feitas a partir do conteúdo dos livros: título, categoria, autores e descrição.'),
  ).toBeInTheDocument()
  expect(screen.queryByText('Como encontramos livros para você?')).not.toBeInTheDocument()
  expect(screen.queryByText('Ver recomendações')).not.toBeInTheDocument()
})

test('a partir de um livro mostra os parecidos com a similaridade do modelo', async () => {
  const { chamadas } = renderizarApp('/recomendacoes?livro=8', {
    'GET /livros/8': detalhe(8, 'Referência'),
    'GET /livros/8/recomendacoes?total=12': {
      id_livro: 8,
      origem: 'tabela',
      recomendacoes: [
        { livro: livro(8, 'Referência'), score: 1, posicao: 0 },
        { livro: livro(9, 'Relacionado'), score: 0.854, posicao: 1 },
      ],
    },
  })

  const itens = await cartoes()
  expect(itens).toHaveLength(1)
  expect(itens[0]).toHaveTextContent('Relacionado')
  expect(itens[0]).toHaveTextContent('Similaridade 85%')
  expect(screen.getByText(/Parecidos com/)).toHaveTextContent('Parecidos com Referência')
  expect(screen.getByRole('link', { name: 'Ver livro' })).toHaveAttribute('href', '/livro/8')
  expect(caminhosChamados(chamadas).filter(rota => rota.includes('/livros')).sort()).toEqual([
    'GET /livros/8',
    'GET /livros/8/recomendacoes?total=12',
  ])
})

test('sem modelo indica mesma categoria', async () => {
  renderizarApp('/recomendacoes?livro=8', {
    'GET /livros/8': detalhe(8, 'Referência'),
    'GET /livros/8/recomendacoes?total=12': { id_livro: 8, origem: 'categoria', recomendacoes: [{ livro: livro(9, 'Vizinho'), score: 0, posicao: 1 }] },
  })
  const [primeiro] = await cartoes()
  expect(primeiro).toHaveTextContent('Mesma categoria')
  expect(primeiro).not.toHaveTextContent('Similaridade')
})

test('livro sem parecidos', async () => {
  renderizarApp('/recomendacoes?livro=8', {
    'GET /livros/8': detalhe(8, 'Referência'),
    'GET /livros/8/recomendacoes?total=12': { id_livro: 8, origem: 'tabela', recomendacoes: [] },
  })
  expect(await screen.findByText('Ainda não encontramos livros parecidos.')).toBeInTheDocument()
})

test('id de livro invalido nao consulta a api', async () => {
  const { chamadas } = renderizarApp('/recomendacoes?livro=abc')
  expect(await screen.findByText('Livro não encontrado.')).toBeInTheDocument()
  expect(caminhosChamados(chamadas).some(rota => rota.includes('/livros'))).toBe(false)
})

test('visitante e convidado a entrar sem consultar livros', async () => {
  const { chamadas } = renderizarApp('/recomendacoes')
  expect(await screen.findByText('Entre na sua conta para receber recomendações.')).toBeInTheDocument()
  expect(screen.getAllByRole('link', { name: 'Entrar' }).at(-1)).toHaveAttribute('href', '/entrar?retorno=%2Frecomendacoes')
  expect(caminhosChamados(chamadas)).toEqual(['GET /auth/me'])
})

test('usuario sem livros salvos', async () => {
  renderizarApp('/recomendacoes', { ...comoAna, 'GET /usuarios/5/livros-salvos': [] })
  expect(await screen.findByText('Salve livros na sua biblioteca para receber recomendações.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Explorar livros' })).toHaveAttribute('href', '/explorar')
})

test('junta as recomendacoes da biblioteca sem repetir livros salvos', async () => {
  renderizarApp('/recomendacoes', {
    ...comoAna,
    'GET /usuarios/5/livros-salvos': [salvo(10, 'Salvo A', 2), salvo(11, 'Salvo B', 1)],
    'GET /livros/10/recomendacoes?total=12': {
      id_livro: 10,
      origem: 'categoria',
      recomendacoes: [
        { livro: livro(11, 'Salvo B'), score: 0, posicao: 1 },
        { livro: livro(20, 'Relacionado'), score: 0, posicao: 2 },
      ],
    },
    'GET /livros/11/recomendacoes?total=12': {
      id_livro: 11,
      origem: 'tabela',
      recomendacoes: [
        { livro: livro(20, 'Relacionado'), score: 0.85, posicao: 1 },
        { livro: livro(21, 'Outro'), score: 0.52, posicao: 2 },
      ],
    },
  })

  const itens = await cartoes()
  expect(itens.map(item => within(item).getByRole('heading', { level: 3 }).textContent)).toEqual(['Relacionado', 'Outro'])
  expect(itens[0]).toHaveTextContent('Semelhante a: Salvo A, Salvo B')
  expect(itens[0]).toHaveTextContent('Similaridade 85%')
  expect(screen.getByText('Com base em 2 livros da sua biblioteca')).toBeInTheDocument()
})

test('usa somente os 8 livros salvos mais recentes', async () => {
  const salvos = Array.from({ length: 10 }, (_, indice) => salvo(100 + indice, `Salvo ${indice}`, indice + 1))
  const rotas: Record<string, unknown> = { ...comoAna, 'GET /usuarios/5/livros-salvos': salvos }
  for (const item of salvos) {
    rotas[`GET /livros/${item.livro.id_livro}/recomendacoes?total=12`] = {
      id_livro: item.livro.id_livro,
      origem: 'tabela',
      recomendacoes: [{ livro: livro(500 + item.livro.id_livro, `Sugestão ${item.livro.id_livro}`), score: 0.5, posicao: 1 }],
    }
  }

  const { chamadas } = renderizarApp('/recomendacoes', rotas)

  await cartoes()
  const consultas = caminhosChamados(chamadas).filter(rota => rota.endsWith('/recomendacoes?total=12'))
  expect(consultas).toHaveLength(8)
  expect(consultas).not.toContain('GET /livros/100/recomendacoes?total=12')
  expect(consultas).not.toContain('GET /livros/101/recomendacoes?total=12')
  expect(screen.getByText('Com base em 8 livros da sua biblioteca (os 8 mais recentes)')).toBeInTheDocument()
})

test('falha parcial mostra o que deu certo e avisa', async () => {
  renderizarApp('/recomendacoes', {
    ...comoAna,
    'GET /usuarios/5/livros-salvos': [salvo(10, 'Salvo A', 2), salvo(11, 'Salvo B', 1)],
    'GET /livros/10/recomendacoes?total=12': { id_livro: 10, origem: 'tabela', recomendacoes: [{ livro: livro(20, 'Achado'), score: 0.6, posicao: 1 }] },
  })
  expect(await cartoes()).toHaveLength(1)
  expect(screen.getByText('Alguns livros da sua biblioteca não puderam ser analisados.')).toBeInTheDocument()
})

test('falha total', async () => {
  renderizarApp('/recomendacoes', { ...comoAna, 'GET /usuarios/5/livros-salvos': [salvo(10, 'Salvo A')] })
  expect(await screen.findByText('Não foi possível carregar as recomendações. Tente novamente em instantes.')).toBeInTheDocument()
})

test('sessao expirada ao consultar a biblioteca', async () => {
  renderizarApp('/recomendacoes', { ...comoAna, 'GET /usuarios/5/livros-salvos': { status: 401 } })
  expect(await screen.findByText(/Sua sessão expirou. Entre novamente./)).toBeInTheDocument()
})
