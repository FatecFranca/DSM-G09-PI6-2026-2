import { Link } from 'react-router'
import { useTituloPagina } from '../componentes/useTituloPagina'

export default function NaoEncontrada() {
  useTituloPagina('Página não encontrada')
  return (
    <section className="pagina">
      <h1>Página não encontrada.</h1>
      <p className="texto-suave" style={{ marginTop: 'var(--esp-3)' }}>
        <Link to="/" className="link">
          Voltar ao início
        </Link>
      </p>
    </section>
  )
}
