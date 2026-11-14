import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, ErroApi, type ClienteApi } from '../api/cliente'
import type { Usuario } from '../api/tipos'
import { ContextoSessao } from './contexto'

interface Propriedades {
  children: ReactNode
  cliente?: ClienteApi
}

export function ProvedorSessao({ children, cliente = api }: Propriedades) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [sessaoExpirada, setSessaoExpirada] = useState(false)

  useEffect(() => {
    let ativo = true
    cliente.aoExpirarSessao(() => {
      setUsuario(null)
      setSessaoExpirada(true)
    })
    cliente
      .me()
      .then(atual => ativo && setUsuario(atual))
      .catch(erro => console.error('Sessão indisponível:', erro))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
      cliente.aoExpirarSessao(() => {})
    }
  }, [cliente])

  const iniciarSessao = useCallback((novo: Usuario) => {
    setUsuario(novo)
    setSessaoExpirada(false)
    return novo
  }, [])

  const entrar = useCallback(
    async (email: string, senha: string) => iniciarSessao(await cliente.entrar(email, senha)),
    [cliente, iniciarSessao],
  )

  const cadastrar = useCallback(
    async (nome: string, email: string, senha: string) => iniciarSessao(await cliente.cadastrar(nome, email, senha)),
    [cliente, iniciarSessao],
  )

  const sair = useCallback(async () => {
    try {
      await cliente.sair()
    } catch (erro) {
      // se a sessao ja tinha expirado no servidor, sair no site e o resultado esperado
      if (!(erro instanceof ErroApi && erro.status === 401)) throw erro
    }
    setUsuario(null)
    setSessaoExpirada(false)
  }, [cliente])

  const sessao = useMemo(
    () => ({ usuario, carregando, sessaoExpirada, entrar, cadastrar, sair }),
    [usuario, carregando, sessaoExpirada, entrar, cadastrar, sair],
  )

  return <ContextoSessao.Provider value={sessao}>{children}</ContextoSessao.Provider>
}
