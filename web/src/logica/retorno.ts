const ORIGEM_DE_REFERENCIA = 'http://nextread.local'

// so aceita caminhos do proprio site, para o login nao redirecionar para fora
export function destinoSeguro(retorno: string | null, padrao = '/biblioteca'): string {
  if (!retorno?.startsWith('/')) return padrao
  try {
    // o navegador ignora tab e quebra de linha na url, entao a checagem e feita na url ja interpretada
    const url = new URL(retorno, ORIGEM_DE_REFERENCIA)
    if (url.origin !== ORIGEM_DE_REFERENCIA) return padrao
    return url.pathname + url.search + url.hash
  } catch {
    return padrao
  }
}
