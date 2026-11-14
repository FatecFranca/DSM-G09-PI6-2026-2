import Logo from './Logo'
import estilos from './Rodape.module.css'

export default function Rodape() {
  return (
    <footer className={estilos.rodape}>
      <div className={`container ${estilos.conteudo}`}>
        <Logo variante="icone" />
        <span>© 2026 NextRead</span>
        <span className={estilos.frase}>Leituras parecidas com as que você gosta.</span>
      </div>
    </footer>
  )
}
