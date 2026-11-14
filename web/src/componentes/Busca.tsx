import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import estilos from './Busca.module.css'

interface Propriedades {
  valorInicial?: string
  aoBuscar?: (termo: string) => void
}

export default function Busca({ valorInicial = '', aoBuscar }: Propriedades) {
  const [termo, setTermo] = useState(valorInicial)
  const navegar = useNavigate()

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    const limpo = termo.trim()
    if (aoBuscar) return aoBuscar(limpo)
    navegar(limpo ? `/explorar?${new URLSearchParams({ busca: limpo })}` : '/explorar')
  }

  return (
    <form className={estilos.busca} role="search" onSubmit={enviar}>
      <input
        type="search"
        className={`campo ${estilos.campo}`}
        aria-label="Buscar livros"
        placeholder="Título, autor ou categoria"
        value={termo}
        onChange={evento => setTermo(evento.target.value)}
      />
      <button type="submit" className={`botao ${estilos.botao}`}>
        Buscar
      </button>
    </form>
  )
}
