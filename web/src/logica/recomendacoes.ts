import type { Motivo } from '../api/tipos'

// "Porque você deu 5★ a Dom Casmurro e salvou Iracema"
export function textoMotivos(motivos: Motivo[]): string {
  if (!motivos.length) return ''
  const partes = motivos.map((motivo, indice) => {
    if (motivo.nota === null) return `salvou ${motivo.titulo}`
    return `${indice === 0 || motivos[0].nota === null ? 'deu ' : ''}${motivo.nota}★ a ${motivo.titulo}`
  })
  return `Porque você ${partes.join(' e ')}`
}
