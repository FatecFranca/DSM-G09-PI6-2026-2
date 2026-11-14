export interface Livro {
  id_livro: number
  titulo: string
  autores: string | null
  categoria: string | null
  ano_publicacao: number | null
  mes_publicacao: string | null
  imagem_capa: string | null
  preco_inicial: number | null
}

export interface Detalhe extends Livro {
  isbn: string | null
  descricao: string | null
  editora: string | null
  avaliacao_media: number | null
}

export interface Usuario {
  id_usuario: number
  nome: string
  email: string
  data_cadastro: string
}

export interface Salvo {
  id_salvo: number
  data_salvo: string
  livro: Livro
}

export interface Pagina {
  itens: Livro[]
  total: number
  pagina: number
  tamanho_pagina: number
  total_paginas: number
}

export interface Categoria {
  categoria: string
  total_livros: number
}

export interface Sugestao {
  livro: Livro
  score: number
  posicao: number
}

export interface Recomendacoes {
  id_livro: number
  origem: string
  recomendacoes: Sugestao[]
}
