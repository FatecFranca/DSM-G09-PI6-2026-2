import { useSearchParams } from 'react-router'
import { api } from '../api/cliente'
import Busca from '../componentes/Busca'
import CartaoLivro from '../componentes/CartaoLivro'
import GradeLivros from '../componentes/GradeLivros'
import Mensagem from '../componentes/Mensagem'
import { useCarregamento } from '../componentes/useCarregamento'
import { useTituloPagina } from '../componentes/useTituloPagina'
import { formatarContagem } from '../logica/formatos'
import estilos from './Explorar.module.css'

const TAMANHO_PAGINA = 12

export default function Explorar() {
  useTituloPagina('Explorar')
  const [parametros, setParametros] = useSearchParams()
  const busca = parametros.get('busca') ?? ''
  const categoria = parametros.get('categoria') ?? ''
  const pagina = Math.max(1, Number(parametros.get('pagina')) || 1)

  const categorias = useCarregamento(() => api.categorias(), [])
  const livros = useCarregamento(
    () => api.livros({ pagina, tamanhoPagina: TAMANHO_PAGINA, busca, categoria }),
    [pagina, busca, categoria],
  )

  function atualizarFiltros(novos: { busca?: string; categoria?: string; pagina?: number }) {
    const proximos = new URLSearchParams(parametros)
    for (const [chave, valor] of Object.entries(novos)) {
      if (valor && !(chave === 'pagina' && valor === 1)) proximos.set(chave, String(valor))
      else proximos.delete(chave)
    }
    if (!('pagina' in novos)) proximos.delete('pagina')
    setParametros(proximos)
  }

  const totalPaginas = livros.estado === 'pronto' ? Math.max(1, livros.dados.total_paginas) : 1

  return (
    <section className="pagina">
      <header className="pagina-cabecalho">
        <h1>Explorar</h1>
      </header>

      <div className={estilos.filtros}>
        <Busca key={busca} valorInicial={busca} aoBuscar={termo => atualizarFiltros({ busca: termo })} />
        <div className={estilos.categoria}>
          <label htmlFor="categoria" className="visualmente-oculto">
            Categoria
          </label>
          <select
            id="categoria"
            className="campo"
            value={categoria}
            onChange={evento => atualizarFiltros({ categoria: evento.target.value })}
          >
            <option value="">Todas as categorias</option>
            {categorias.estado === 'pronto' &&
              categorias.dados
                .filter(item => item.categoria)
                .map(item => (
                  <option key={item.categoria} value={item.categoria}>
                    {item.categoria}
                  </option>
                ))}
          </select>
        </div>
      </div>

      {livros.estado === 'carregando' && <Mensagem>Carregando...</Mensagem>}
      {livros.estado === 'erro' && (
        <Mensagem tipo="erro">Não foi possível carregar o catálogo. Tente novamente em instantes.</Mensagem>
      )}
      {livros.estado === 'pronto' && (
        <>
          <p className={estilos.contador}>{formatarContagem(livros.dados.total, 'livro', 'livros')}</p>
          {livros.dados.itens.length ? (
            <GradeLivros rotulo="Livros do catálogo">
              {livros.dados.itens.map(livro => (
                <CartaoLivro key={livro.id_livro} livro={livro} />
              ))}
            </GradeLivros>
          ) : (
            <Mensagem>Nenhum livro encontrado.</Mensagem>
          )}

          <nav className={estilos.paginacao} aria-label="Paginação">
            <button
              type="button"
              className="botao botao-secundario"
              disabled={pagina <= 1}
              onClick={() => atualizarFiltros({ pagina: pagina - 1 })}
            >
              Anterior
            </button>
            <span className="texto-suave">
              Página {pagina} de {totalPaginas}
            </span>
            <button
              type="button"
              className="botao botao-secundario"
              disabled={pagina >= totalPaginas}
              onClick={() => atualizarFiltros({ pagina: pagina + 1 })}
            >
              Próxima
            </button>
          </nav>
        </>
      )}
    </section>
  )
}
