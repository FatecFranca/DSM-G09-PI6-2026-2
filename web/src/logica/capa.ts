export const CORES_DE_CAPA = ['#5C3828', '#7A5038', '#4A2C1F'] as const

export function corDaCapa(idLivro: number): string {
  return CORES_DE_CAPA[Math.abs(idLivro) % CORES_DE_CAPA.length]
}
