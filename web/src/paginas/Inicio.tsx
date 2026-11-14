import { Link } from 'react-router'
import { api } from '../api/cliente'
import Busca from '../componentes/Busca'
import CartaoLivro from '../componentes/CartaoLivro'
import GradeLivros from '../componentes/GradeLivros'
import Mensagem from '../componentes/Mensagem'
import { useCarregamento } from '../componentes/useCarregamento'
import { useTituloPagina } from '../componentes/useTituloPagina'
import estilos from './Inicio.module.css'

export default function Inicio() {
  useTituloPagina()
  const destaques = useCarregamento(() => api.livros({ pagina: 1, tamanhoPagina: 8 }), [])

  return (
    <>
      <section className={estilos.apresentacao}>
        <h1>
          Seu próximo livro <em>começa aqui.</em>
        </h1>
        <p>Busque, guarde e descubra leituras parecidas com as que você gosta.</p>
        <Busca />
      </section>

      <section className={estilos.catalogo} aria-labelledby="titulo-catalogo">
        <div className={estilos.cabecalho}>
          <h2 id="titulo-catalogo">Do catálogo</h2>
          <Link to="/explorar" className="link">
            Ver todos
          </Link>
        </div>

        {destaques.estado === 'carregando' && <Mensagem>Carregando...</Mensagem>}
        {destaques.estado === 'erro' && (
          <Mensagem tipo="erro">Não foi possível carregar o catálogo. Tente novamente em instantes.</Mensagem>
        )}
        {destaques.estado === 'pronto' &&
          (destaques.dados.itens.length ? (
            <GradeLivros rotulo="Do catálogo">
              {destaques.dados.itens.map(livro => (
                <CartaoLivro key={livro.id_livro} livro={livro} />
              ))}
            </GradeLivros>
          ) : (
            <Mensagem>Ainda não há livros no catálogo.</Mensagem>
          ))}
      </section>
    </>
  )
}
