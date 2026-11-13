import test from 'node:test';
import assert from 'node:assert/strict';
import { criarCliente, ApiError } from '../src/client';
function mock(body: unknown, status = 200) {
  const calls: { url: string; options?: RequestInit }[] = [];
  const transport = (async (url: string, options?: RequestInit) => {
    calls.push({ url, options }); return new Response(status === 204 ? null : JSON.stringify(body), { status });
  }) as typeof fetch;
  return { client: criarCliente('https://api.example/', transport), calls };
}
test('login envia cookie credentials, JSON e header exigido pela API', async () => {
  const { client, calls } = mock({ id_usuario: 3 });
  await client.entrar('leitor@example.com', 'segredo123');
  assert.equal(calls[0].url, 'https://api.example/auth/entrar');
  assert.equal(calls[0].options?.credentials, 'include');
  assert.equal(calls[0].options?.method, 'POST');
  assert.equal((calls[0].options?.headers as Record<string, string>)['X-NextRead-Request'], '1');
  assert.deepEqual(JSON.parse(calls[0].options?.body as string), { email: 'leitor@example.com', senha: 'segredo123' });
});
test('busca codifica categoria e consulta, usando os parâmetros do controller', async () => {
  const { client, calls } = mock({ itens: [] });
  await client.livros(2, 'A & B', 'Fiction, Fantasy');
  const url = new URL(calls[0].url);
  assert.equal(url.searchParams.get('busca'), 'A & B');
  assert.equal(url.searchParams.get('categoria'), 'Fiction, Fantasy');
  assert.equal(url.searchParams.get('tamanhoPagina'), '20');
  assert.equal(url.searchParams.get('pagina'), '2');
});
test('salvar e remover usam usuário da sessão e tratam 204', async () => {
  const { client, calls } = mock(null, 204);
  await client.salvar(3, 7); assert.equal(await client.remover(3, 7), undefined);
  assert.equal(calls[0].url, 'https://api.example/usuarios/3/livros-salvos/7');
  assert.equal(calls[0].options?.method, 'POST'); assert.equal(calls[1].options?.method, 'DELETE');
});
test('senha usa snake_case compatível com DTO da API', async () => {
  const { client, calls } = mock(null, 204); await client.senha(3, 'antiga123', 'nova12345');
  assert.deepEqual(JSON.parse(calls[0].options?.body as string), { senha_atual: 'antiga123', nova_senha: 'nova12345' });
});
test('401 em recurso protegido encerra sessão; login inválido não dispara expiração', async () => {
  const { client } = mock({ title: 'Não autorizado' }, 401); let expired = 0;
  client.onExpired(() => expired++);
  await assert.rejects(client.salvos(3), (e: ApiError) => e.status === 401);
  assert.equal(expired, 1); await assert.rejects(client.entrar('x', 'y')); assert.equal(expired, 1);
});
test('exibe erros de validação e mantém sessão em 403', async () => {
  const { client } = mock({ errors: { Nome: ['Nome obrigatório'] } }, 400);
  await assert.rejects(client.cadastrar('', '', ''), /Nome obrigatório/);
  const denied = mock({}, 403); let expired = false; denied.client.onExpired(() => expired = true);
  await assert.rejects(denied.client.salvos(4)); assert.equal(expired, false);
});
test('erro de rede tem mensagem útil e URL inválida é rejeitada', async () => {
  assert.throws(() => criarCliente('arquivo://x'));
  const client = criarCliente('https://api.example', (async () => { throw new TypeError('network'); }) as typeof fetch);
  await assert.rejects(client.me(), /conectar à API/);
});
