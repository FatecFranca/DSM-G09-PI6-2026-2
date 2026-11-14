import { useContext } from 'react'
import { ContextoSessao, type Sessao } from './contexto'

export function useSessao(): Sessao {
  const sessao = useContext(ContextoSessao)
  if (!sessao) throw new Error('useSessao precisa estar dentro de ProvedorSessao')
  return sessao
}
