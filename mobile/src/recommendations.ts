import type { Recomendacoes, Salvo, SugestaoComOrigem } from './types';
// Mantém a mesma estratégia da web: até oito sementes recentes, sem livros já salvos.
export async function recomendar(salvos: Salvo[], buscar: (id: number) => Promise<Recomendacoes>) {
  const results = await Promise.allSettled(salvos.slice(0, 8).map(s => buscar(s.livro.id_livro)));
  const ignorar = new Set(salvos.map(s => s.livro.id_livro));
  const livros = new Map<number, SugestaoComOrigem>();
  let falhas = 0;
  for (const result of results) {
    if (result.status === 'rejected') { falhas++; continue; }
    for (const item of result.value.recomendacoes) {
      if (ignorar.has(item.livro.id_livro)) continue;
      const anterior = livros.get(item.livro.id_livro);
      const candidato = { ...item, origem: result.value.origem };
      if (!anterior || (candidato.origem === 'tabela' && anterior.origem !== 'tabela') ||
          (candidato.origem === anterior.origem && candidato.score > anterior.score)) livros.set(item.livro.id_livro, candidato);
    }
  }
  if (results.length && falhas === results.length) throw new Error('Não foi possível carregar as recomendações. Tente novamente.');
  return { itens: [...livros.values()].sort((a, b) => Number(b.origem === 'tabela') - Number(a.origem === 'tabela') || b.score - a.score), falhas };
}
