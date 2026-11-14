import { describe, expect, test } from 'vitest'
import type { Salvo, Sugestao } from '../api/tipos'
import { livro } from '../teste/fabricas'
import { agruparRecomendacoes, ordenarSalvosRecentes, textoFontes } from './recomendacoes'

function salvo(id: number, titulo: string, data = '2026-11-01T10:00:00Z'): Salvo {
  return { id_salvo: id * 100, data_salvo: data, livro: livro(id, titulo) }
}

function sugestao(id: number, titulo: string, score: number): Sugestao {
  return { livro: livro(id, titulo), score, posicao: 1 }
}

describe('agruparRecomendacoes', () => {
  test('exclui livros ja salvos e junta as fontes de cada sugestao', () => {
    const salvos = [salvo(10, 'Salvo A'), salvo(11, 'Salvo B')]
    const resultado = agruparRecomendacoes(
      [
        { referencia: 'Salvo A', origem: 'categoria', recomendacoes: [sugestao(11, 'Salvo B', 0), sugestao(20, 'Relacionado', 0)] },
        { referencia: 'Salvo B', origem: 'tabela', recomendacoes: [sugestao(20, 'Relacionado', 0.85), sugestao(21, 'Outro', 0.52)] },
      ],
      salvos,
    )

    expect(resultado.map(item => item.livro.id_livro)).toEqual([20, 21])
    expect(resultado[0]).toMatchObject({ fontes: ['Salvo A', 'Salvo B'], comModelo: true, melhorScore: 0.85 })
  })

  test('com o mesmo numero de fontes, maior score vem primeiro e o empate segue a ordem de chegada', () => {
    const resultado = agruparRecomendacoes(
      [
        {
          referencia: 'A',
          origem: 'tabela',
          recomendacoes: [sugestao(1, 'Um', 0.3), sugestao(2, 'Dois', 0.9), sugestao(3, 'Tres', 0.3)],
        },
      ],
      [],
    )
    expect(resultado.map(item => item.livro.id_livro)).toEqual([2, 1, 3])
  })

  test('origem por categoria nao conta como modelo nem altera o score', () => {
    const [unico] = agruparRecomendacoes(
      [{ referencia: 'A', origem: 'categoria', recomendacoes: [sugestao(1, 'Um', 0.7)] }],
      [],
    )
    expect(unico).toMatchObject({ comModelo: false, melhorScore: 0 })
  })

  test('respeita o limite', () => {
    const recomendacoes = [1, 2, 3, 4].map(id => sugestao(id, `L${id}`, 0.5))
    expect(agruparRecomendacoes([{ referencia: 'A', origem: 'tabela', recomendacoes }], [], 2)).toHaveLength(2)
  })
})

describe('textoFontes', () => {
  test('lista ate dois livros e resume o restante', () => {
    expect(textoFontes(['A'])).toBe('Semelhante a: A')
    expect(textoFontes(['A', 'B'])).toBe('Semelhante a: A, B')
    expect(textoFontes(['A', 'B', 'C', 'D'])).toBe('Semelhante a: A, B e mais 2')
  })
})

describe('ordenarSalvosRecentes', () => {
  test('ordena do mais recente para o mais antigo sem alterar a lista original', () => {
    const lista = [salvo(1, 'Velho', '2026-01-01T00:00:00Z'), salvo(2, 'Novo', '2026-11-01T00:00:00Z')]
    expect(ordenarSalvosRecentes(lista).map(item => item.livro.titulo)).toEqual(['Novo', 'Velho'])
    expect(lista[0].livro.titulo).toBe('Velho')
  })
})
