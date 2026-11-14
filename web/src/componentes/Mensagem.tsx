import type { ReactNode } from 'react'
import estilos from './Mensagem.module.css'

interface Propriedades {
  tipo?: 'info' | 'erro'
  children: ReactNode
}

export default function Mensagem({ tipo = 'info', children }: Propriedades) {
  return (
    <p className={`${estilos.mensagem} ${tipo === 'erro' ? estilos.erro : ''}`} role={tipo === 'erro' ? 'alert' : 'status'}>
      {children}
    </p>
  )
}
