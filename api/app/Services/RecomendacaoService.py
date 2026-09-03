from collections.abc import Iterator
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import scipy.sparse as sparse
from sklearn.feature_extraction.text import TfidfVectorizer
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.Models.LivroModel import Livro
from app.Models.LivroSimilarModel import LivroSimilar

NomeDoArquivoDoModelo = "modelo-tfidf.joblib"

# pesos por repeticao: categoria e autor pesam mais que a descricao crua
PesoDoTitulo = 2
PesoDaCategoria = 3
PesoDosAutores = 2


@dataclass
class ModeloRecomendacao:
    Vetorizador: TfidfVectorizer
    Matriz: sparse.csr_matrix
    Ids: np.ndarray
    TreinadoEm: str

    def GetLinhaPorId(self) -> dict[int, int]:
        if not hasattr(self, "_linhaPorId"):
            self._linhaPorId = {int(id_): linha for linha, id_ in enumerate(self.Ids)}
        return self._linhaPorId

    def GetTotalDeLivros(self) -> int:
        return int(self.Matriz.shape[0])

    def GetTotalDeTermos(self) -> int:
        return int(self.Matriz.shape[1])


def MontarTextoDeConteudo(
    titulo: str | None,
    categoria: str | None,
    autores: str | None,
    descricao: str | None,
) -> str:
    partes: list[str] = []
    if titulo:
        partes.extend([titulo] * PesoDoTitulo)
    if categoria:
        partes.extend([categoria] * PesoDaCategoria)
    if autores:
        partes.extend([autores] * PesoDosAutores)
    if descricao:
        partes.append(descricao)
    return " ".join(partes)


def CarregarCorpus(sessao: Session) -> tuple[np.ndarray, list[str]]:
    consulta = select(
        Livro.IdLivro, Livro.Titulo, Livro.Categoria, Livro.Autores, Livro.Descricao
    ).order_by(Livro.IdLivro)

    ids: list[int] = []
    textos: list[str] = []
    for idLivro, titulo, categoria, autores, descricao in sessao.execute(
        consulta.execution_options(yield_per=5_000)
    ):
        ids.append(idLivro)
        textos.append(MontarTextoDeConteudo(titulo, categoria, autores, descricao))
    return np.array(ids, dtype=np.int64), textos


def TreinarModelo(
    sessao: Session,
    minDf: int = 3,
    maxDf: float = 0.5,
    maxFeatures: int = 120_000,
    ngramMaximo: int = 1,
) -> ModeloRecomendacao:
    ids, textos = CarregarCorpus(sessao)
    if len(ids) == 0:
        raise ValueError("nao ha livros no banco para treinar o modelo")

    vetorizador = TfidfVectorizer(
        strip_accents="unicode",
        lowercase=True,
        stop_words="english",
        min_df=minDf,
        max_df=maxDf,
        max_features=maxFeatures,
        ngram_range=(1, ngramMaximo),
        sublinear_tf=True,
        norm="l2",
    )
    matriz = vetorizador.fit_transform(textos).astype(np.float32)

    return ModeloRecomendacao(
        Vetorizador=vetorizador,
        Matriz=sparse.csr_matrix(matriz),
        Ids=ids,
        TreinadoEm=datetime.now(timezone.utc).isoformat(timespec="seconds"),
    )


def SalvarModelo(modelo: ModeloRecomendacao, diretorio: Path) -> Path:
    diretorio.mkdir(parents=True, exist_ok=True)
    caminho = diretorio / NomeDoArquivoDoModelo
    joblib.dump(modelo, caminho, compress=3)
    return caminho


def CarregarModelo(diretorio: Path) -> ModeloRecomendacao | None:
    caminho = diretorio / NomeDoArquivoDoModelo
    if not caminho.exists():
        return None
    return joblib.load(caminho)


def CalcularSimilares(
    modelo: ModeloRecomendacao, idLivro: int, total: int = 10
) -> list[tuple[int, float]]:
    linha = modelo.GetLinhaPorId().get(int(idLivro))
    if linha is None:
        return []

    vetor = modelo.Matriz[linha]
    if vetor.nnz == 0:
        return []

    # a matriz ja sai normalizada em l2, entao o produto interno e o cosseno
    scores = np.asarray((modelo.Matriz @ vetor.T).todense()).ravel()
    scores[linha] = -1.0

    total = min(total, scores.size - 1)
    if total <= 0:
        return []

    candidatos = np.argpartition(-scores, total)[:total]
    candidatos = candidatos[np.argsort(-scores[candidatos])]

    return [
        (int(modelo.Ids[indice]), float(scores[indice]))
        for indice in candidatos
        if scores[indice] > 0
    ]


def CalcularSimilaresEmBloco(
    modelo: ModeloRecomendacao, total: int = 10, tamanhoBloco: int = 256
) -> Iterator[tuple[int, int, float, int]]:
    matriz = modelo.Matriz
    totalDeLivros = matriz.shape[0]
    total = min(total, totalDeLivros - 1)
    if total <= 0:
        return

    for inicio in range(0, totalDeLivros, tamanhoBloco):
        fim = min(inicio + tamanhoBloco, totalDeLivros)
        scores = np.asarray((matriz[inicio:fim] @ matriz.T).todense())

        for deslocamento in range(fim - inicio):
            linha = inicio + deslocamento
            linhaDeScores = scores[deslocamento]
            linhaDeScores[linha] = -1.0

            candidatos = np.argpartition(-linhaDeScores, total)[:total]
            candidatos = candidatos[np.argsort(-linhaDeScores[candidatos])]

            posicao = 0
            for indice in candidatos:
                score = float(linhaDeScores[indice])
                if score <= 0:
                    continue
                posicao += 1
                yield int(modelo.Ids[linha]), posicao, score, int(modelo.Ids[indice])


def BuscarSimilaresNaTabela(
    sessao: Session, idLivro: int, total: int
) -> list[tuple[int, float]]:
    consulta = (
        select(LivroSimilar.IdLivroSimilar, LivroSimilar.Score)
        .where(LivroSimilar.IdLivro == idLivro)
        .order_by(LivroSimilar.Posicao)
        .limit(total)
    )
    return [(int(idSimilar), float(score)) for idSimilar, score in sessao.execute(consulta)]


def BuscarSimilaresPorCategoria(
    sessao: Session, livro: Livro, total: int
) -> list[tuple[int, float]]:
    # plano b quando nao ha modelo treinado nem tabela preenchida
    if not livro.Categoria:
        return []
    categoriaPrincipal = livro.Categoria.split(",")[0].strip()
    if not categoriaPrincipal:
        return []

    consulta = (
        select(Livro.IdLivro)
        .where(Livro.Categoria.ilike(f"%{categoriaPrincipal}%"))
        .where(Livro.IdLivro != livro.IdLivro)
        .order_by(Livro.IdLivro)
        .limit(total)
    )
    return [(int(idLivro), 0.0) for idLivro in sessao.scalars(consulta)]


def GetRecomendacoes(
    sessao: Session,
    livro: Livro,
    modelo: ModeloRecomendacao | None,
    total: int = 10,
) -> tuple[str, list[tuple[int, float]]]:
    similares = BuscarSimilaresNaTabela(sessao, livro.IdLivro, total)
    if similares:
        return "tabela", similares

    if modelo is not None:
        similares = CalcularSimilares(modelo, livro.IdLivro, total)
        if similares:
            return "modelo", similares

    return "categoria", BuscarSimilaresPorCategoria(sessao, livro, total)


def PersistirSimilares(
    sessao: Session, modelo: ModeloRecomendacao, total: int = 10, tamanhoBloco: int = 256
) -> int:
    sessao.execute(text("TRUNCATE livros_similares"))
    sessao.commit()

    conexao = sessao.connection().connection.driver_connection
    comando = "COPY livros_similares (id_livro, posicao, id_livro_similar, score) FROM STDIN"

    totalGravado = 0
    with conexao.cursor() as cursor, cursor.copy(comando) as copia:
        for idLivro, posicao, score, idSimilar in CalcularSimilaresEmBloco(
            modelo, total, tamanhoBloco
        ):
            copia.write_row((idLivro, posicao, idSimilar, score))
            totalGravado += 1

    sessao.commit()
    return totalGravado
