import { Children, isValidElement, type ReactNode } from 'react'
import estilos from './GradeLivros.module.css'

interface Propriedades {
  rotulo: string
  children: ReactNode
}

export default function GradeLivros({ rotulo, children }: Propriedades) {
  return (
    <ul className={estilos.grade} aria-label={rotulo}>
      {Children.toArray(children).map((filho, indice) => (
        <li key={isValidElement(filho) && filho.key !== null ? filho.key : indice}>{filho}</li>
      ))}
    </ul>
  )
}
