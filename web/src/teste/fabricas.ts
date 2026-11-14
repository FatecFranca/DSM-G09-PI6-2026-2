import type { Livro, Pagina } from '../api/tipos'

export function livro(id: number, titulo: string, extra: Partial<Livro> = {}): Livro {
  return {
    id_livro: id,
    titulo,
    autores: 'Teste',
    categoria: 'Fantasia',
    ano_publicacao: null,
    mes_publicacao: null,
    imagem_capa: null,
    preco_inicial: null,
    ...extra,
  }
}

export function pagina(itens: Livro[], extra: Partial<Pagina> = {}): Pagina {
  return { itens, total: itens.length, pagina: 1, tamanho_pagina: itens.length, total_paginas: 1, ...extra }
}
