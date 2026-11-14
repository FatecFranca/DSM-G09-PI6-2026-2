import { useState, type FormEvent } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import { ErroApi } from '../api/cliente'
import Mensagem from '../componentes/Mensagem'
import { useTituloPagina } from '../componentes/useTituloPagina'
import { destinoSeguro } from '../logica/retorno'
import { useSessao } from '../sessao/useSessao'
import estilos from './Entrar.module.css'

type Aba = 'entrar' | 'cadastro'

export default function Entrar() {
  useTituloPagina('Entrar')
  const { usuario, carregando, entrar, cadastrar } = useSessao()
  const [parametros] = useSearchParams()
  const [aba, setAba] = useState<Aba>('entrar')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  if (!carregando && usuario) return <Navigate to={destinoSeguro(parametros.get('retorno'))} replace />

  function trocarAba(nova: Aba) {
    setAba(nova)
    setErro('')
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const dados = new FormData(evento.currentTarget)
    const campo = (nome: string) => String(dados.get(nome) ?? '')

    if (aba === 'cadastro' && campo('senha') !== campo('confirmar_senha')) {
      setErro('As senhas não conferem.')
      return
    }

    setEnviando(true)
    setErro('')
    try {
      if (aba === 'entrar') await entrar(campo('email'), campo('senha'))
      else await cadastrar(campo('nome'), campo('email'), campo('senha'))
    } catch (falha) {
      console.error(falha)
      setErro(falha instanceof ErroApi ? falha.message : 'Não foi possível concluir. Tente novamente em instantes.')
      setEnviando(false)
    }
  }

  return (
    <section className={`pagina ${estilos.pagina}`}>
      <div className={estilos.caixa}>
        <h1>Entrar no NextRead</h1>
        <p className="texto-suave">Guarde seus livros e receba recomendações.</p>

        <div className={estilos.abas} role="tablist" aria-label="Forma de acesso">
          <button type="button" role="tab" aria-selected={aba === 'entrar'} onClick={() => trocarAba('entrar')}>
            Entrar
          </button>
          <button type="button" role="tab" aria-selected={aba === 'cadastro'} onClick={() => trocarAba('cadastro')}>
            Criar conta
          </button>
        </div>

        <form key={aba} className={estilos.formulario} onSubmit={enviar}>
          {aba === 'cadastro' && (
            <div>
              <label className="rotulo" htmlFor="nome">Nome completo</label>
              <input id="nome" name="nome" className="campo" autoComplete="name" minLength={2} maxLength={150} required />
            </div>
          )}
          <div>
            <label className="rotulo" htmlFor="email">E-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              className="campo"
              autoComplete={aba === 'entrar' ? 'username' : 'email'}
              maxLength={255}
              required
            />
          </div>
          {aba === 'entrar' ? (
            <div>
              <label className="rotulo" htmlFor="senha">Senha</label>
              <input id="senha" name="senha" type="password" className="campo" autoComplete="current-password" required />
            </div>
          ) : (
            <>
              <div>
                <label className="rotulo" htmlFor="senha">Senha (mínimo de 8 caracteres)</label>
                <input
                  id="senha"
                  name="senha"
                  type="password"
                  className="campo"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={100}
                  required
                />
              </div>
              <div>
                <label className="rotulo" htmlFor="confirmar_senha">Confirme a senha</label>
                <input
                  id="confirmar_senha"
                  name="confirmar_senha"
                  type="password"
                  className="campo"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={100}
                  required
                />
              </div>
            </>
          )}

          <button type="submit" className="botao" disabled={enviando}>
            {enviando ? 'Aguarde...' : aba === 'entrar' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
      </div>
    </section>
  )
}
