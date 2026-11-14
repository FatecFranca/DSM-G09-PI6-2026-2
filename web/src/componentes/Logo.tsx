import estilos from './Logo.module.css'

interface Propriedades {
  variante?: 'completa' | 'icone'
}

export default function Logo({ variante = 'completa' }: Propriedades) {
  if (variante === 'icone') return <img className={estilos.icone} src="/favicon.png" alt="" width={28} height={28} />
  return <img className={estilos.completa} src="/logo-nextread.png" alt="NextRead" width={600} height={164} />
}
