import type { Categoria, Detalhe, Pagina, Recomendacoes, Salvo, Usuario } from './types';
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
// Injetável para testar contratos sem acessar o banco nem a API de produção.
export function criarCliente(base: string, transportar: typeof fetch = fetch) {
  const url = base.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(url)) throw new Error('EXPO_PUBLIC_API_URL deve ser uma URL HTTP(S).');
  let aoExpirar = () => {};
  async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await transportar(url + path, {
        method, credentials: 'include', signal: controller.signal,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-NextRead-Request': '1' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 401 && !path.startsWith('/auth/entrar')) aoExpirar();
        const validation = Object.values(data.errors ?? {}).flat().join('\n');
        throw new ApiError(validation || data.title || data.mensagem ||
          (response.status === 429 ? 'Muitas tentativas. Aguarde um minuto.' : `Falha na API (${response.status}).`), response.status);
      }
      return response.status === 204 ? undefined as T : await response.json();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error(controller.signal.aborted
        ? 'A API demorou para responder. Tente novamente; o servidor pode estar iniciando.'
        : 'Não foi possível conectar à API. Verifique sua conexão e o endereço configurado.');
    } finally { clearTimeout(timer); }
  }
  return {
    onExpired(fn: () => void) { aoExpirar = fn; },
    me: () => request<Usuario>('/auth/me'),
    entrar: (email: string, senha: string) => request<Usuario>('/auth/entrar', 'POST', { email, senha }),
    cadastrar: (nome: string, email: string, senha: string) => request<Usuario>('/auth/cadastro', 'POST', { nome, email, senha }),
    sair: () => request<void>('/auth/sair', 'POST'),
    livros: (pagina = 1, busca = '', categoria = '') => request<Pagina>(`/livros?pagina=${pagina}&tamanhoPagina=20&busca=${encodeURIComponent(busca)}&categoria=${encodeURIComponent(categoria)}`),
    categorias: () => request<Categoria[]>('/categorias?limite=100'),
    detalhe: (id: number) => request<Detalhe>(`/livros/${id}`),
    similares: (id: number) => request<Recomendacoes>(`/livros/${id}/recomendacoes?total=12`),
    salvos: (id: number) => request<Salvo[]>(`/usuarios/${id}/livros-salvos`),
    salvar: (usuario: number, livro: number) => request<Salvo>(`/usuarios/${usuario}/livros-salvos/${livro}`, 'POST'),
    remover: (usuario: number, livro: number) => request<void>(`/usuarios/${usuario}/livros-salvos/${livro}`, 'DELETE'),
    perfil: (id: number, nome: string, email: string) => request<Usuario>(`/usuarios/${id}`, 'PUT', { nome, email }),
    senha: (id: number, senha_atual: string, nova_senha: string) => request<void>(`/usuarios/${id}/senha`, 'PUT', { senha_atual, nova_senha }),
  };
}
