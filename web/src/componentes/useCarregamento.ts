/* oxlint-disable react-hooks/exhaustive-deps -- as dependencias vem de quem chama o hook */
import { useEffect, useState, type DependencyList } from 'react'

export type Carregamento<T> =
  | { estado: 'carregando' }
  | { estado: 'pronto'; dados: T }
  | { estado: 'erro'; erro: unknown }

// ignora respostas antigas quando as dependencias mudam antes da requisicao terminar
export function useCarregamento<T>(carregar: () => Promise<T>, dependencias: DependencyList): Carregamento<T> {
  const [resultado, setResultado] = useState<Carregamento<T>>({ estado: 'carregando' })

  useEffect(() => {
    let atual = true
    setResultado({ estado: 'carregando' })
    carregar()
      .then(dados => atual && setResultado({ estado: 'pronto', dados }))
      .catch(erro => {
        console.error(erro)
        if (atual) setResultado({ estado: 'erro', erro })
      })
    return () => {
      atual = false
    }
  }, dependencias)

  return resultado
}
