import test from 'node:test';
import assert from 'node:assert/strict';
import { recomendar } from '../src/recommendations';
import type { Livro, Recomendacoes, Salvo } from '../src/types';
const book = (id: number) => ({ id_livro: id, titulo: `Livro ${id}` }) as Livro;
const saved = (id: number) => ({ livro: book(id) }) as Salvo;
function result(id: number, origem: string, ids: number[]): Recomendacoes {
  return { id_livro: id, origem, recomendacoes: ids.map((n, posicao) => ({ livro: book(n), score: n / 10, posicao })) };
}
test('remove livros já salvos e duplicatas, priorizando TF-IDF sobre categoria', async () => {
  const data = await recomendar([saved(1), saved(2)], async id => id === 1 ? result(id, 'categoria', [1, 2, 3, 4]) : result(id, 'tabela', [3, 5]));
  assert.deepEqual(data.itens.map(x => x.livro.id_livro), [5, 3, 4]);
  assert.equal(data.itens.find(x => x.livro.id_livro === 3)?.origem, 'tabela');
});
test('limita oito sementes e exclui todos os salvos, inclusive fora das sementes', async () => {
  const calls: number[] = [];
  const data = await recomendar(Array.from({ length: 10 }, (_, i) => saved(i + 1)), async id => { calls.push(id); return result(id, 'tabela', [10, 20]); });
  assert.equal(calls.length, 8); assert.deepEqual(data.itens.map(x => x.livro.id_livro), [20]);
});
test('falha parcial preserva resultados e falha total permite nova tentativa', async () => {
  const data = await recomendar([saved(1), saved(2)], async id => { if (id === 1) throw new Error('offline'); return result(id, 'categoria', [3]); });
  assert.equal(data.falhas, 1); assert.equal(data.itens.length, 1);
  await assert.rejects(recomendar([saved(1)], async () => { throw new Error('offline'); }), /recomendações/);
  assert.deepEqual(await recomendar([], async () => { throw new Error('não deve chamar'); }), { itens: [], falhas: 0 });
});
