import { describe, expect, test } from 'vitest'
import type { Motivo } from '../api/tipos'
import { textoMotivos } from './recomendacoes'

const motivo = (titulo: string, nota: number | null): Motivo => ({ id_livro: titulo.length, titulo, nota })

describe('textoMotivos', () => {
  test('uma nota', () => {
    expect(textoMotivos([motivo('Dom Casmurro', 5)])).toBe('Porque você deu 5★ a Dom Casmurro')
  })

  test('duas notas', () => {
    expect(textoMotivos([motivo('Dom Casmurro', 5), motivo('O Cortiço', 4)])).toBe(
      'Porque você deu 5★ a Dom Casmurro e 4★ a O Cortiço',
    )
  })

  test('livro so salvo', () => {
    expect(textoMotivos([motivo('Iracema', null)])).toBe('Porque você salvou Iracema')
  })

  test('nota e salvo juntos', () => {
    expect(textoMotivos([motivo('Dom Casmurro', 5), motivo('Iracema', null)])).toBe(
      'Porque você deu 5★ a Dom Casmurro e salvou Iracema',
    )
  })

  test('sem motivos', () => {
    expect(textoMotivos([])).toBe('')
  })
})
