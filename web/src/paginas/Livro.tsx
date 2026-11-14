import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { api, ErroApi } from '../api/cliente'
import type { Detalhe } from '../api/tipos'
import CapaLivro from '../componentes/CapaLivro'
import Estrelas from '../componentes/Estrelas'
import Mensagem from '../componentes/Mensagem'
import { useCarregamento } from '../componentes/useCarregamento'
import { useTituloPagina } from '../componentes/useTituloPagina'
import { formatarPreco, formatarPublicacao } from '../logica/formatos'
import { useSessao } from '../sessao/useSessao'
import estilos from './Livro.module.css'

export default function Livro() {
  const { id = '' } = useParams()
  if (!/^\d+$/.test(id)) return <LivroNaoEncontrado />
  return <DetalheDoLivro key={id} id={Number(id)} />
}

function LivroNaoEncontrado() {
  useTituloPagina('Livro não encontrado')
  return (
    <section className="pagina">
      <Mensagem>Livro não encontrado.</Mensagem>
      <Link to="/explorar" className="link">
        Explorar livros
      </Link>
    </section>
  )
}

function DetalheDoLivro({ id }: { id: number }) {
  const carregamento = useCarregamento(() => api.detalhe(id), [id])
  useTituloPagina(carregamento.estado === 'pronto' ? carregamento.dados.titulo : 'Livro')

  if (carregamento.estado === 'carregando') {
    return (
      <section className="pagina">
        <Mensagem>Carregando...</Mensagem>
      </section>
    )
  }
  if (carregamento.estado === 'erro') {
    if (carregamento.erro instanceof ErroApi && carregamento.erro.status === 404) return <LivroNaoEncontrado />
    return (
      <section className="pagina">
        <Mensagem tipo="erro">Não foi possível carregar este livro. Tente novamente em instantes.</Mensagem>
      </section>
    )
  }

  const livro = carregamento.dados
  return (
    <article className={`pagina ${estilos.livro}`}>
      <div className={estilos.capa}>
        <CapaLivro livro={livro} tamanho="grande" />
      </div>

      <div className={estilos.conteudo}>
        <span className="sobretitulo">{livro.categoria || 'Sem categoria'}</span>
        <h1 className={estilos.titulo}>{livro.titulo || 'Sem título'}</h1>
        <p className={estilos.autor}>por {livro.autores || 'Autor desconhecido'}</p>

        <dl className={estilos.ficha}>
          <div>
            <dt>Editora</dt>
            <dd>{livro.editora || 'Não informada'}</dd>
          </div>
          <div>
            <dt>Publicação</dt>
            <dd>{formatarPublicacao(livro.mes_publicacao, livro.ano_publicacao)}</dd>
          </div>
          <div>
            <dt>Preço inicial</dt>
            <dd>{formatarPreco(livro.preco_inicial)}</dd>
          </div>
        </dl>

        <AcoesDoLivro livro={livro} />

        <section className={estilos.descricao} aria-labelledby="titulo-descricao">
          <h2 id="titulo-descricao">Descrição</h2>
          <p>{livro.descricao || 'Descrição não disponível.'}</p>
        </section>
      </div>
    </article>
  )
}

function AcoesDoLivro({ livro }: { livro: Detalhe }) {
  const { usuario, carregando } = useSessao()
  const idUsuario = usuario?.id_usuario
  const verificacao = useCarregamento(
    async () => {
      if (idUsuario === undefined) return false
      const salvos = await api.salvos(idUsuario)
      return salvos.some(salvo => salvo.livro.id_livro === livro.id_livro)
    },
    [idUsuario, livro.id_livro],
  )
  const [salvando, setSalvando] = useState(false)
  const [salvoAgora, setSalvoAgora] = useState(false)
  const [erro, setErro] = useState('')

  // se a biblioteca nao puder ser consultada, o botao continua liberado para salvar
  const salvo = salvoAgora || (verificacao.estado === 'pronto' && verificacao.dados)
  const verificando = verificacao.estado === 'carregando'

  async function salvar() {
    if (!usuario) return
    setSalvando(true)
    setErro('')
    try {
      await api.salvar(usuario.id_usuario, livro.id_livro)
      setSalvoAgora(true)
    } catch (falha) {
      console.error(falha)
      setErro(
        falha instanceof ErroApi && falha.status === 401
          ? 'Sua sessão expirou. Entre novamente.'
          : 'Não foi possível salvar o livro. Tente novamente.',
      )
    } finally {
      setSalvando(false)
    }
  }

  const retorno = new URLSearchParams({ retorno: `/livro/${livro.id_livro}` })

  return (
    <>
      <div className={estilos.acoes}>
        {usuario ? (
          <button type="button" className="botao" onClick={salvar} disabled={verificando || salvando || salvo}>
            {salvo ? 'Salvo na biblioteca' : 'Salvar na biblioteca'}
          </button>
        ) : (
          !carregando && (
            <Link to={`/entrar?${retorno}`} className="botao">
              Entrar para salvar
            </Link>
          )
        )}
        <Link to={`/recomendacoes?livro=${livro.id_livro}`} className="botao botao-secundario">
          Ver semelhantes
        </Link>
      </div>
      {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
      {usuario && <NotaDoLivro idLivro={livro.id_livro} />}
    </>
  )
}

function NotaDoLivro({ idLivro }: { idLivro: number }) {
  // sem conseguir ler a nota, as estrelas aparecem vazias e continuam funcionando
  const consulta = useCarregamento(() => api.avaliacao(idLivro), [idLivro])
  const [notaAgora, setNotaAgora] = useState<number | null | undefined>(undefined)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const nota = notaAgora !== undefined ? notaAgora : consulta.estado === 'pronto' ? consulta.dados.nota : null

  async function alterar(acao: () => Promise<number | null>) {
    setEnviando(true)
    setErro('')
    try {
      setNotaAgora(await acao())
    } catch (falha) {
      console.error(falha)
      setErro(
        falha instanceof ErroApi && falha.status === 401
          ? 'Sua sessão expirou. Entre novamente.'
          : 'Não foi possível salvar sua nota. Tente novamente.',
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <Estrelas
        nota={nota}
        desabilitado={enviando || consulta.estado === 'carregando'}
        aoEscolher={valor => alterar(async () => (await api.avaliar(idLivro, valor)).nota)}
        aoRemover={() =>
          alterar(async () => {
            await api.removerAvaliacao(idLivro)
            return null
          })
        }
      />
      {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
    </>
  )
}
