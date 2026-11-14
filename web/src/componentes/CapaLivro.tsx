import { useState } from 'react'
import type { Livro } from '../api/tipos'
import { corDaCapa } from '../logica/capa'
import estilos from './CapaLivro.module.css'

interface Propriedades {
  livro: Pick<Livro, 'id_livro' | 'titulo' | 'autores' | 'imagem_capa'>
  tamanho?: 'normal' | 'grande'
}

export default function CapaLivro({ livro, tamanho = 'normal' }: Propriedades) {
  const [imagemFalhou, setImagemFalhou] = useState(false)
  const titulo = livro.titulo?.trim() || 'Sem título'
  const classe = `${estilos.capa} ${tamanho === 'grande' ? estilos.grande : ''}`
  const usarImagem = !imagemFalhou && /^https?:\/\//i.test(livro.imagem_capa ?? '')

  if (usarImagem) {
    return (
      <div className={classe}>
        <img
          className={estilos.imagem}
          src={livro.imagem_capa!}
          alt={`Capa de ${titulo}`}
          loading="lazy"
          onError={() => setImagemFalhou(true)}
        />
      </div>
    )
  }

  return (
    <div className={`${classe} ${estilos.generica}`} style={{ backgroundColor: corDaCapa(livro.id_livro) }} aria-label={`Capa de ${titulo}`}>
      <span className={estilos.titulo}>{titulo}</span>
      {livro.autores && <span className={estilos.autor}>{livro.autores}</span>}
    </div>
  )
}
