import { Link, useSearchParams } from 'react-router'
import { api } from '../api/cliente'
import type { Livro, ParaVoce } from '../api/tipos'
import CartaoLivro from '../componentes/CartaoLivro'
import GradeLivros from '../componentes/GradeLivros'
import Mensagem from '../componentes/Mensagem'
import { useCarregamento } from '../componentes/useCarregamento'
import { useTituloPagina } from '../componentes/useTituloPagina'
import { formatarContagem } from '../logica/formatos'
import { textoMotivos } from '../logica/recomendacoes'
import { useSessao } from '../sessao/useSessao'
import estilos from './Recomendacoes.module.css'

const ERRO_GERAL = 'Não foi possível carregar as recomendações. Tente novamente em instantes.'

export default function Recomendacoes() {
  useTituloPagina('Recomendações')
  const [parametros] = useSearchParams()
  const idLivro = parametros.get('livro')

  return (
    <section className="pagina">
      <header className="pagina-cabecalho">
        <h1>Recomendações</h1>
        <p>Sugestões feitas a partir do conteúdo dos livros: título, categoria, autores e descrição.</p>
      </header>
      {idLivro === null ? (
        <RecomendacoesDaBiblioteca />
      ) : /^\d+$/.test(idLivro) ? (
        <ParecidosComLivro key={idLivro} id={Number(idLivro)} />
      ) : (
        <Mensagem>Livro não encontrado.</Mensagem>
      )}
    </section>
  )
}

interface Recomendado {
  livro: Livro
  selo?: string
  motivo?: string
}

function ListaDeRecomendados({ itens }: { itens: Recomendado[] }) {
  if (!itens.length) return <Mensagem>Ainda não encontramos livros parecidos.</Mensagem>
  return (
    <GradeLivros rotulo="Recomendações">
      {itens.map(({ livro, selo, motivo }) => (
        <CartaoLivro key={livro.id_livro} livro={livro}>
          {selo && <span className={estilos.selo}>{selo}</span>}
          {motivo && <span className={estilos.fontes}>{motivo}</span>}
        </CartaoLivro>
      ))}
    </GradeLivros>
  )
}

function textoSimilaridade(similaridade: number | null) {
  return similaridade === null
    ? 'Mesma categoria'
    : `Similaridade ${Math.round(Math.min(1, Math.max(0, similaridade)) * 100)}%`
}

function ParecidosComLivro({ id }: { id: number }) {
  const carregamento = useCarregamento(() => Promise.all([api.detalhe(id), api.recomendacoes(id)]), [id])

  if (carregamento.estado === 'carregando') return <Mensagem>Carregando...</Mensagem>
  if (carregamento.estado === 'erro') return <Mensagem tipo="erro">{ERRO_GERAL}</Mensagem>

  const [referencia, resultado] = carregamento.dados
  const comModelo = resultado.origem === 'tabela'
  const itens = resultado.recomendacoes
    .filter(item => item.livro && item.livro.id_livro !== id)
    .map(item => ({ livro: item.livro, selo: textoSimilaridade(comModelo ? item.score : null) }))

  return (
    <>
      <p className={estilos.referencia}>
        Parecidos com <strong>{referencia.titulo || `Livro ${id}`}</strong>.{' '}
        <Link to={`/livro/${id}`} className="link">
          Ver livro
        </Link>
      </p>
      <ListaDeRecomendados itens={itens} />
    </>
  )
}

function RecomendacoesDaBiblioteca() {
  const { usuario, carregando, sessaoExpirada } = useSessao()

  if (carregando) return <Mensagem>Carregando...</Mensagem>
  if (!usuario) {
    return (
      <Mensagem>
        {sessaoExpirada ? 'Sua sessão expirou. Entre novamente.' : 'Entre na sua conta para receber recomendações.'}{' '}
        <Link to="/entrar?retorno=%2Frecomendacoes">Entrar</Link>
      </Mensagem>
    )
  }
  return <ParaVoceDoUsuario idUsuario={usuario.id_usuario} />
}

function textoBase({ total_avaliacoes, total_salvos }: ParaVoce) {
  const partes = []
  if (total_avaliacoes) partes.push(formatarContagem(total_avaliacoes, 'avaliação', 'avaliações'))
  if (total_salvos) partes.push(formatarContagem(total_salvos, 'livro salvo', 'livros salvos'))
  return `Com base em ${partes.join(' e ')}`
}

// idUsuario so serve para recarregar quando a conta muda; a api usa a sessao
function ParaVoceDoUsuario({ idUsuario }: { idUsuario: number }) {
  const carregamento = useCarregamento(() => api.paraVoce(), [idUsuario])

  return (
    <section aria-labelledby="titulo-para-voce">
      <h2 id="titulo-para-voce" className={estilos.titulo}>
        Para você
      </h2>
      {carregamento.estado === 'carregando' && <Mensagem>Carregando...</Mensagem>}
      {carregamento.estado === 'erro' && <Mensagem tipo="erro">{ERRO_GERAL}</Mensagem>}
      {carregamento.estado === 'pronto' &&
        (carregamento.dados.origem === 'sem_dados' || !carregamento.dados.recomendacoes.length ? (
          <Mensagem>
            Avalie ou salve livros para receber sugestões. <Link to="/explorar">Explorar livros</Link>
          </Mensagem>
        ) : (
          <>
            <p className={estilos.referencia}>{textoBase(carregamento.dados)}</p>
            <ListaDeRecomendados
              itens={carregamento.dados.recomendacoes.map(sugestao => ({
                livro: sugestao.livro,
                selo: sugestao.origem === 'categoria' ? 'Mesma categoria' : undefined,
                motivo: textoMotivos(sugestao.motivos),
              }))}
            />
          </>
        ))}
    </section>
  )
}
