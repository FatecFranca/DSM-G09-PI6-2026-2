import { Link, useSearchParams } from 'react-router'
import { api } from '../api/cliente'
import type { Livro, Usuario } from '../api/tipos'
import CartaoLivro from '../componentes/CartaoLivro'
import GradeLivros from '../componentes/GradeLivros'
import Mensagem from '../componentes/Mensagem'
import { useCarregamento } from '../componentes/useCarregamento'
import { useTituloPagina } from '../componentes/useTituloPagina'
import { formatarContagem } from '../logica/formatos'
import {
  agruparRecomendacoes,
  ordenarSalvosRecentes,
  textoFontes,
  type ResultadoRecomendacao,
} from '../logica/recomendacoes'
import { useSessao } from '../sessao/useSessao'
import estilos from './Recomendacoes.module.css'

const LIMITE_DE_SALVOS = 8
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
  similaridade: number | null
  fontes?: string[]
}

function ListaDeRecomendados({ itens }: { itens: Recomendado[] }) {
  if (!itens.length) return <Mensagem>Ainda não encontramos livros parecidos.</Mensagem>
  return (
    <GradeLivros rotulo="Recomendações">
      {itens.map(({ livro, similaridade, fontes }) => (
        <CartaoLivro key={livro.id_livro} livro={livro}>
          <span className={estilos.selo}>
            {similaridade === null
              ? 'Mesma categoria'
              : `Similaridade ${Math.round(Math.min(1, Math.max(0, similaridade)) * 100)}%`}
          </span>
          {fontes && <span className={estilos.fontes}>{textoFontes(fontes)}</span>}
        </CartaoLivro>
      ))}
    </GradeLivros>
  )
}

function ParecidosComLivro({ id }: { id: number }) {
  const carregamento = useCarregamento(() => Promise.all([api.detalhe(id), api.recomendacoes(id)]), [id])

  if (carregamento.estado === 'carregando') return <Mensagem>Carregando...</Mensagem>
  if (carregamento.estado === 'erro') return <Mensagem tipo="erro">{ERRO_GERAL}</Mensagem>

  const [referencia, resultado] = carregamento.dados
  const comModelo = resultado.origem === 'tabela'
  const itens = resultado.recomendacoes
    .filter(item => item.livro && item.livro.id_livro !== id)
    .map(item => ({ livro: item.livro, similaridade: comModelo ? item.score : null }))

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
  return <SugestoesDaBiblioteca usuario={usuario} />
}

async function buscarSugestoes(idUsuario: number) {
  const salvos = await api.salvos(idUsuario)
  if (!salvos.length) return null

  const amostra = ordenarSalvosRecentes(salvos).slice(0, LIMITE_DE_SALVOS)
  const respostas = await Promise.allSettled(
    amostra.map(async (salvo): Promise<ResultadoRecomendacao> => {
      const resultado = await api.recomendacoes(salvo.livro.id_livro)
      return { referencia: salvo.livro.titulo || 'Livro salvo', origem: resultado.origem, recomendacoes: resultado.recomendacoes }
    }),
  )
  const resultados = respostas.flatMap(resposta => (resposta.status === 'fulfilled' ? [resposta.value] : []))
  if (!resultados.length) throw new Error('nenhuma recomendacao pode ser consultada')

  return {
    totalSalvos: salvos.length,
    analisados: amostra.length,
    houveFalha: resultados.length < respostas.length,
    sugestoes: agruparRecomendacoes(resultados, salvos),
  }
}

function SugestoesDaBiblioteca({ usuario }: { usuario: Usuario }) {
  const carregamento = useCarregamento(() => buscarSugestoes(usuario.id_usuario), [usuario.id_usuario])

  if (carregamento.estado === 'carregando') return <Mensagem>Carregando...</Mensagem>
  if (carregamento.estado === 'erro') return <Mensagem tipo="erro">{ERRO_GERAL}</Mensagem>
  if (!carregamento.dados) {
    return (
      <Mensagem>
        Salve livros na sua biblioteca para receber recomendações. <Link to="/explorar">Explorar livros</Link>
      </Mensagem>
    )
  }

  const { totalSalvos, analisados, houveFalha, sugestoes } = carregamento.dados
  const recorte = totalSalvos > analisados ? ` (os ${LIMITE_DE_SALVOS} mais recentes)` : ''

  return (
    <>
      <p className={estilos.referencia}>
        {`Com base em ${formatarContagem(analisados, 'livro', 'livros')} da sua biblioteca${recorte}`}
      </p>
      {houveFalha && <Mensagem>Alguns livros da sua biblioteca não puderam ser analisados.</Mensagem>}
      <ListaDeRecomendados
        itens={sugestoes.map(sugestao => ({
          livro: sugestao.livro,
          similaridade: sugestao.comModelo ? sugestao.melhorScore : null,
          fontes: sugestao.fontes,
        }))}
      />
    </>
  )
}
