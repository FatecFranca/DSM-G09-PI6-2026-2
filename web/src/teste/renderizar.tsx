import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import App from '../App'
import type { Usuario } from '../api/tipos'
import { ProvedorSessao } from '../sessao/ContextoSessao'
import { instalarFetchFalso } from './fetchFalso'

export const usuarioAna: Usuario = {
  id_usuario: 5,
  nome: 'Ana Souza',
  email: 'ana@teste.com',
  data_cadastro: '2026-11-01T10:00:00Z',
}

export const comoVisitante = { 'GET /auth/me': { status: 401 } }
export const comoAna = { 'GET /auth/me': usuarioAna }

export function renderizarApp(caminho: string, rotas: Record<string, unknown> = {}) {
  const chamadas = instalarFetchFalso({ ...comoVisitante, ...rotas })
  const usuario = userEvent.setup()
  render(
    <MemoryRouter initialEntries={[caminho]}>
      <ProvedorSessao>
        <App />
      </ProvedorSessao>
    </MemoryRouter>,
  )
  return { chamadas, usuario }
}

export function caminhosChamados(chamadas: { url: string; init: RequestInit }[]) {
  return chamadas.map(chamada => `${chamada.init.method} ${chamada.url}`)
}
