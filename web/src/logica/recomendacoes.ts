import type { Livro, Salvo, Sugestao } from '../api/tipos'

export interface ResultadoRecomendacao {
  referencia: string
  origem: string
  recomendacoes: Sugestao[]
}

export interface SugestaoAgrupada {
  livro: Livro
  fontes: string[]
  melhorScore: number
  comModelo: boolean
}

interface Acumulado extends SugestaoAgrupada {
  ordem: number
}

// a porcentagem so existe quando a sugestao veio do modelo tf-idf (origem "tabela")
export function agruparRecomendacoes(
  resultados: ResultadoRecomendacao[],
  salvos: Salvo[],
  limite = 12,
): SugestaoAgrupada[] {
  const jaSalvos = new Set(salvos.map(salvo => salvo.livro.id_livro))
  const encontrados = new Map<number, Acumulado>()

  for (const resultado of resultados) {
    for (const { livro, score } of resultado.recomendacoes) {
      if (!livro?.id_livro || jaSalvos.has(livro.id_livro)) continue

      let atual = encontrados.get(livro.id_livro)
      if (!atual) {
        atual = { livro, fontes: [], melhorScore: 0, comModelo: false, ordem: encontrados.size }
        encontrados.set(livro.id_livro, atual)
      }
      if (!atual.fontes.includes(resultado.referencia)) atual.fontes.push(resultado.referencia)
      if (resultado.origem === 'tabela' && Number.isFinite(score)) {
        atual.comModelo = true
        atual.melhorScore = Math.max(atual.melhorScore, score)
      }
    }
  }

  return [...encontrados.values()]
    .sort((a, b) => b.fontes.length - a.fontes.length || b.melhorScore - a.melhorScore || a.ordem - b.ordem)
    .slice(0, limite)
    .map(({ ordem: _ordem, ...sugestao }) => sugestao)
}

export function textoFontes(fontes: string[]): string {
  const restantes = fontes.length - 2
  return `Semelhante a: ${fontes.slice(0, 2).join(', ')}${restantes > 0 ? ` e mais ${restantes}` : ''}`
}

export function ordenarSalvosRecentes(salvos: Salvo[]): Salvo[] {
  return [...salvos].sort((a, b) => Date.parse(b.data_salvo) - Date.parse(a.data_salvo))
}
