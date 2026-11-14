const numero = new Intl.NumberFormat('pt-BR')
const moeda = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatarPreco(valor: number | null): string {
  return valor === null ? 'Não informado' : `US$ ${moeda.format(valor)}`
}

export function formatarPublicacao(mes: string | null, ano: number | null): string {
  return [mes, ano].filter(Boolean).join(' de ') || 'Não informada'
}

export function formatarContagem(quantidade: number, singular: string, plural: string): string {
  return `${numero.format(quantidade)} ${quantidade === 1 ? singular : plural}`
}
