import { useState } from 'react'
import { Link } from 'react-router'
import { api, ErroApi } from '../api/cliente'
import type { Salvo, Usuario } from '../api/tipos'
import CartaoLivro from '../componentes/CartaoLivro'
import GradeLivros from '../componentes/GradeLivros'
import Mensagem from '../componentes/Mensagem'
import { useCarregamento } from '../componentes/useCarregamento'
import { useTituloPagina } from '../componentes/useTituloPagina'
import { formatarContagem } from '../logica/formatos'
import { useSessao } from '../sessao/useSessao'
import estilos from './Biblioteca.module.css'

const ORDENACOES = {
  'Mais recentes': (a: Salvo, b: Salvo) => Date.parse(b.data_salvo) - Date.parse(a.data_salvo),
  'Mais antigos': (a: Salvo, b: Salvo) => Date.parse(a.data_salvo) - Date.parse(b.data_salvo),
  'Título A–Z': (a: Salvo, b: Salvo) => a.livro.titulo.localeCompare(b.livro.titulo, 'pt-BR'),
  'Título Z–A': (a: Salvo, b: Salvo) => b.livro.titulo.localeCompare(a.livro.titulo, 'pt-BR'),
}

type Ordenacao = keyof typeof ORDENACOES

export default function Biblioteca() {
  useTituloPagina('Minha biblioteca')
  const { usuario, carregando, sessaoExpirada } = useSessao()

  return (
    <section className="pagina">
      <header className="pagina-cabecalho">
        <h1>Minha biblioteca</h1>
      </header>
      {carregando && <Mensagem>Carregando...</Mensagem>}
      {!carregando && !usuario && (
        <Mensagem>
          {sessaoExpirada ? 'Sua sessão expirou. Entre novamente.' : 'Entre na sua conta para ver sua biblioteca.'}{' '}
          <Link to="/entrar?retorno=%2Fbiblioteca">Entrar</Link>
        </Mensagem>
      )}
      {usuario && <ListaDeSalvos usuario={usuario} />}
    </section>
  )
}

function ListaDeSalvos({ usuario }: { usuario: Usuario }) {
  const carregamento = useCarregamento(() => api.salvos(usuario.id_usuario), [usuario.id_usuario])
  const [removidos, setRemovidos] = useState<Set<number>>(new Set())
  const [removendo, setRemovendo] = useState<number | null>(null)
  const [termo, setTermo] = useState('')
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('Mais recentes')
  const [erro, setErro] = useState('')

  if (carregamento.estado === 'carregando') return <Mensagem>Carregando...</Mensagem>
  if (carregamento.estado === 'erro') {
    return <Mensagem tipo="erro">Não foi possível carregar sua biblioteca. Tente novamente em instantes.</Mensagem>
  }

  const itens = carregamento.dados.filter(item => !removidos.has(item.livro.id_livro))
  if (!itens.length) {
    return (
      <Mensagem>
        Sua biblioteca está vazia. <Link to="/explorar">Explorar livros</Link>
      </Mensagem>
    )
  }

  const categorias = new Set(itens.map(item => item.livro.categoria).filter(Boolean)).size
  const busca = termo.trim().toLocaleLowerCase('pt-BR')
  const visiveis = itens
    .filter(({ livro }) =>
      `${livro.titulo} ${livro.autores ?? ''} ${livro.categoria ?? ''}`.toLocaleLowerCase('pt-BR').includes(busca),
    )
    .sort(ORDENACOES[ordenacao])

  async function remover(idLivro: number) {
    setRemovendo(idLivro)
    setErro('')
    try {
      await api.remover(usuario.id_usuario, idLivro)
      setRemovidos(anteriores => new Set(anteriores).add(idLivro))
    } catch (falha) {
      console.error(falha)
      setErro(
        falha instanceof ErroApi && falha.status === 401
          ? 'Sua sessão expirou. Entre novamente.'
          : 'Não foi possível remover o livro. Tente novamente.',
      )
    } finally {
      setRemovendo(null)
    }
  }

  return (
    <>
      <p className={estilos.resumo}>
        {formatarContagem(itens.length, 'livro', 'livros')} · {formatarContagem(categorias, 'categoria', 'categorias')}
      </p>

      <div className={estilos.controles}>
        <input
          type="search"
          className="campo"
          aria-label="Buscar na biblioteca"
          placeholder="Buscar na biblioteca"
          value={termo}
          onChange={evento => setTermo(evento.target.value)}
        />
        <select
          className="campo"
          aria-label="Ordenar"
          value={ordenacao}
          onChange={evento => setOrdenacao(evento.target.value as Ordenacao)}
        >
          {Object.keys(ORDENACOES).map(opcao => (
            <option key={opcao}>{opcao}</option>
          ))}
        </select>
      </div>

      {erro && <Mensagem tipo="erro">{erro}</Mensagem>}

      {visiveis.length ? (
        <GradeLivros rotulo="Livros salvos">
          {visiveis.map(({ livro }) => (
            <CartaoLivro key={livro.id_livro} livro={livro}>
              <button
                type="button"
                className={estilos.remover}
                aria-label={`Remover ${livro.titulo}`}
                disabled={removendo === livro.id_livro}
                onClick={() => remover(livro.id_livro)}
              >
                Remover
              </button>
            </CartaoLivro>
          ))}
        </GradeLivros>
      ) : (
        <Mensagem>Nenhum livro encontrado.</Mensagem>
      )}
    </>
  )
}
