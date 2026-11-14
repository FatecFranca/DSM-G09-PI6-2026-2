import estilos from './Estrelas.module.css'

const NOTAS = [1, 2, 3, 4, 5]

interface Propriedades {
  nota: number | null
  desabilitado?: boolean
  aoEscolher: (nota: number) => void
  aoRemover: () => void
}

export default function Estrelas({ nota, desabilitado = false, aoEscolher, aoRemover }: Propriedades) {
  return (
    <div role="group" aria-label="Sua nota" className={estilos.estrelas}>
      <span className={estilos.rotulo}>Sua nota</span>
      {NOTAS.map(valor => {
        const cheia = nota !== null && valor <= nota
        return (
          <button
            key={valor}
            type="button"
            className={estilos.estrela}
            aria-label={`Dar ${valor} ${valor === 1 ? 'estrela' : 'estrelas'}`}
            aria-pressed={cheia}
            disabled={desabilitado}
            onClick={() => aoEscolher(valor)}
          >
            {cheia ? '★' : '☆'}
          </button>
        )
      })}
      {nota !== null && (
        <button type="button" className={`link ${estilos.remover}`} disabled={desabilitado} onClick={aoRemover}>
          Remover nota
        </button>
      )}
    </div>
  )
}
