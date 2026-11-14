function idValido(valor: string | null): valor is string {
  return valor !== null && /^\d+$/.test(valor)
}

export function converterUrlAntiga(caminho: string, busca: string): string | null {
  const parametros = new URLSearchParams(busca)
  const pagina = caminho.split('/').pop()

  switch (pagina) {
    case 'index.html':
      return '/'
    case 'pesquisa.html': {
      const termo = parametros.get('busca')
      return termo ? `/explorar?${new URLSearchParams({ busca: termo })}` : '/explorar'
    }
    case 'livro.html': {
      const id = parametros.get('id')
      return idValido(id) ? `/livro/${id}` : '/explorar'
    }
    case 'recomendacoes.html': {
      const id = parametros.get('id')
      return idValido(id) ? `/recomendacoes?livro=${id}` : '/recomendacoes'
    }
    case 'salvos.html':
      return '/biblioteca'
    case 'login.html': {
      const retornoAntigo = parametros.get('retorno')
      if (!retornoAntigo) return '/entrar'
      const [caminhoAntigo, buscaAntiga = ''] = retornoAntigo.split('?')
      const retorno = converterUrlAntiga(`/${caminhoAntigo}`, buscaAntiga) ?? '/biblioteca'
      return `/entrar?${new URLSearchParams({ retorno })}`
    }
    default:
      return null
  }
}
