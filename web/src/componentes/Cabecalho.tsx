import { Link, NavLink, useNavigate } from 'react-router'
import { useSessao } from '../sessao/useSessao'
import Logo from './Logo'
import estilos from './Cabecalho.module.css'

const LINKS = [
  { para: '/', texto: 'Início' },
  { para: '/explorar', texto: 'Explorar' },
  { para: '/biblioteca', texto: 'Minha biblioteca' },
  { para: '/recomendacoes', texto: 'Recomendações' },
]

export default function Cabecalho() {
  const { usuario, carregando, sair } = useSessao()
  const navegar = useNavigate()

  async function encerrarSessao() {
    try {
      await sair()
      navegar('/')
    } catch (erro) {
      console.error(erro)
      window.alert('Não foi possível sair. Tente novamente.')
    }
  }

  return (
    <header className={estilos.cabecalho}>
      <div className={`container ${estilos.conteudo}`}>
        <Link to="/" className={estilos.marca} aria-label="NextRead, página inicial">
          <Logo />
        </Link>

        <nav className={estilos.navegacao} aria-label="Principal">
          {LINKS.map(link => (
            <NavLink key={link.para} to={link.para} end={link.para === '/'} className={estilos.link}>
              {link.texto}
            </NavLink>
          ))}
        </nav>

        <div className={estilos.conta}>
          {usuario ? (
            <>
              <span className={estilos.saudacao}>Olá, {usuario.nome.split(' ')[0]}</span>
              <button type="button" className="botao botao-secundario" onClick={encerrarSessao}>
                Sair
              </button>
            </>
          ) : (
            !carregando && (
              <Link to="/entrar" className="botao">
                Entrar
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  )
}
