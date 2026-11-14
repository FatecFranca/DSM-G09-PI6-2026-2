import { createContext } from 'react'
import type { Usuario } from '../api/tipos'

export interface Sessao {
  usuario: Usuario | null
  carregando: boolean
  sessaoExpirada: boolean
  entrar(email: string, senha: string): Promise<Usuario>
  cadastrar(nome: string, email: string, senha: string): Promise<Usuario>
  sair(): Promise<void>
}

export const ContextoSessao = createContext<Sessao | null>(null)
