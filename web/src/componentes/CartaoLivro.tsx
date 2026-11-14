import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { Livro } from '../api/tipos'
import CapaLivro from './CapaLivro'
import estilos from './CartaoLivro.module.css'

interface Propriedades {
  livro: Livro
  children?: ReactNode
}

export default function CartaoLivro({ livro, children }: Propriedades) {
  return (
    <article className={estilos.cartao}>
      <Link to={`/livro/${livro.id_livro}`} className={estilos.link}>
        <CapaLivro livro={livro} />
        <span className={estilos.categoria}>{livro.categoria || 'Sem categoria'}</span>
        <h3 className={estilos.titulo}>{livro.titulo || 'Sem título'}</h3>
        <p className={estilos.autor}>{livro.autores || 'Autor desconhecido'}</p>
      </Link>
      {children && <div className={estilos.extras}>{children}</div>}
    </article>
  )
}
