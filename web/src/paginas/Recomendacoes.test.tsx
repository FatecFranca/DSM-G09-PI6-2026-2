import { screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { livro } from '../teste/fabricas'
import { caminhosChamados, comoAna, renderizarApp } from '../teste/renderizar'

const detalhe = (id: number, titulo: string) => ({ ...livro(id, titulo), isbn: null, descricao: null, editora: null, avaliacao_media: null })
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

const ROTA_PARA_VOCE = 'GET /usuarios/me/para-voce?total=20'

const motivo = (id: number, titulo: string, nota: number | null) => ({ id_livro: id, titulo, nota })

test('para voce mostra as sugestoes da api com o motivo de cada uma', async () => {
  const { chamadas } = renderizarApp('/recomendacoes', {
    ...comoAna,
    [ROTA_PARA_VOCE]: {
      origem: 'avaliacoes',
      total_avaliacoes: 2,
      total_salvos: 1,
      recomendacoes: [
        { livro: livro(812, 'Quincas Borba'), pontuacao: 1.64, posicao: 1, origem: 'avaliacoes', motivos: [motivo(31, 'Dom Casmurro', 5), motivo(77, 'O Cortiço', 4)] },
        { livro: livro(400, 'Senhora'), pontuacao: 0.55, posicao: 2, origem: 'avaliacoes', motivos: [motivo(50, 'Iracema', null)] },
      ],
    },
  })

  expect(await screen.findByRole('heading', { level: 2, name: 'Para você' })).toBeInTheDocument()
  const itens = await cartoes()
  expect(itens.map(item => within(item).getByRole('heading', { level: 3 }).textContent)).toEqual(['Quincas Borba', 'Senhora'])
  expect(itens[0]).toHaveTextContent('Porque você deu 5★ a Dom Casmurro e 4★ a O Cortiço')
  expect(itens[1]).toHaveTextContent('Porque você salvou Iracema')
  expect(itens[0]).not.toHaveTextContent('Mesma categoria')
  expect(screen.getByText('Com base em 2 avaliações e 1 livro salvo')).toBeInTheDocument()
  expect(caminhosChamados(chamadas)).toEqual(['GET /auth/me', ROTA_PARA_VOCE])
})

test('para voce por categoria indica mesma categoria', async () => {
  renderizarApp('/recomendacoes', {
    ...comoAna,
    [ROTA_PARA_VOCE]: {
      origem: 'categoria',
      total_avaliacoes: 1,
      total_salvos: 0,
      recomendacoes: [{ livro: livro(50, 'Iracema'), pontuacao: 0, posicao: 1, origem: 'categoria', motivos: [motivo(31, 'Dom Casmurro', 5)] }],
    },
  })
  const [primeiro] = await cartoes()
  expect(primeiro).toHaveTextContent('Mesma categoria')
  expect(primeiro).toHaveTextContent('Porque você deu 5★ a Dom Casmurro')
  expect(screen.getByText('Com base em 1 avaliação')).toBeInTheDocument()
})

test('lista completada com a categoria marca so os itens complementares', async () => {
  renderizarApp('/recomendacoes', {
    ...comoAna,
    [ROTA_PARA_VOCE]: {
      origem: 'avaliacoes',
      total_avaliacoes: 1,
      total_salvos: 0,
      recomendacoes: [
        { livro: livro(812, 'Quincas Borba'), pontuacao: 1.2, posicao: 1, origem: 'avaliacoes', motivos: [motivo(31, 'Dom Casmurro', 5)] },
        { livro: livro(50, 'Iracema'), pontuacao: 0, posicao: 2, origem: 'categoria', motivos: [motivo(31, 'Dom Casmurro', 5)] },
      ],
    },
  })
  const [vizinho, complemento] = await cartoes()
  expect(vizinho).not.toHaveTextContent('Mesma categoria')
  expect(complemento).toHaveTextContent('Mesma categoria')
  expect(complemento).toHaveTextContent('Porque você deu 5★ a Dom Casmurro')
})

test('sem notas nem salvos convida a avaliar', async () => {
  renderizarApp('/recomendacoes', {
    ...comoAna,
    [ROTA_PARA_VOCE]: { origem: 'sem_dados', total_avaliacoes: 0, total_salvos: 0, recomendacoes: [] },
  })
  expect(await screen.findByText('Avalie ou salve livros para receber sugestões.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Explorar livros' })).toHaveAttribute('href', '/explorar')
})

test('falha ao carregar o para voce', async () => {
  renderizarApp('/recomendacoes', { ...comoAna, [ROTA_PARA_VOCE]: { status: 500 } })
  expect(await screen.findByText('Não foi possível carregar as recomendações. Tente novamente em instantes.')).toBeInTheDocument()
})

test('sessao expirada ao consultar o para voce', async () => {
  renderizarApp('/recomendacoes', { ...comoAna, [ROTA_PARA_VOCE]: { status: 401 } })
  expect(await screen.findByText(/Sua sessão expirou. Entre novamente./)).toBeInTheDocument()
})
