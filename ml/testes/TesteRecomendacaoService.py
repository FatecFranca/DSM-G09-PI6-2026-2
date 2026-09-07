import numpy as np
import pytest
import scipy.sparse as sparse
from sklearn.feature_extraction.text import TfidfVectorizer

from Mineracao.RecomendacaoService import (
    CalcularSimilares,
    CalcularSimilaresEmBloco,
    ModeloRecomendacao,
    MontarTextoDeConteudo,
    PesoDaCategoria,
)

Catalogo = [
    (10, "O Hobbit", "Fantasia, Aventura", "Tolkien", "uma jornada por terras magicas com anoes"),
    (20, "O Senhor dos Aneis", "Fantasia, Aventura", "Tolkien", "uma jornada por terras magicas e um anel"),
    (30, "Receitas de Bolo", "Culinaria, Sobremesas", "Maria", "bolos e doces para o cafe da tarde"),
    (40, "Doces Faceis", "Culinaria, Sobremesas", "Maria", "doces simples para o cafe da tarde"),
    (50, "Contabilidade Geral", "Negocios", "Joao", "balanco patrimonial e demonstracao de resultado"),
]


@pytest.fixture
def Modelo() -> ModeloRecomendacao:
    ids = np.array([livro[0] for livro in Catalogo], dtype=np.int64)
    textos = [MontarTextoDeConteudo(t, c, a, d) for _, t, c, a, d in Catalogo]
    vetorizador = TfidfVectorizer(strip_accents="unicode", lowercase=True, norm="l2")
    matriz = sparse.csr_matrix(vetorizador.fit_transform(textos).astype(np.float32))
    return ModeloRecomendacao(
        Vetorizador=vetorizador, Matriz=matriz, Ids=ids, TreinadoEm="teste"
    )


def TesteCategoriaPesaMaisQueDescricao():
    texto = MontarTextoDeConteudo("Titulo", "Fantasia", "Autor", "descricao")
    assert texto.count("Fantasia") == PesoDaCategoria
    assert texto.count("descricao") == 1


def TesteCampoNuloNaoEntraNoTexto():
    assert MontarTextoDeConteudo("Titulo", None, None, None).strip() == "Titulo Titulo"
    assert MontarTextoDeConteudo(None, None, None, None) == ""


def TesteRecomendaLivroDoMesmoTema(Modelo):
    similares = CalcularSimilares(Modelo, 10, total=2)
    assert similares[0][0] == 20


def TesteNaoRecomendaOProprioLivro(Modelo):
    similares = CalcularSimilares(Modelo, 30, total=4)
    assert 30 not in [idLivro for idLivro, _ in similares]


def TesteScoresSaoDecrescentesEDentroDoIntervalo(Modelo):
    similares = CalcularSimilares(Modelo, 30, total=4)
    scores = [score for _, score in similares]
    assert scores == sorted(scores, reverse=True)
    assert all(0 < score <= 1.0000001 for score in scores)


def TesteLivroInexistenteNaoQuebra(Modelo):
    assert CalcularSimilares(Modelo, 999, total=5) == []


def TesteBlocoBateComCalculoIndividual(Modelo):
    porBloco: dict[int, list[tuple[int, float]]] = {}
    for idLivro, posicao, score, idSimilar in CalcularSimilaresEmBloco(Modelo, total=3, tamanhoBloco=2):
        porBloco.setdefault(idLivro, []).append((idSimilar, score))

    for idLivro in [livro[0] for livro in Catalogo]:
        individual = CalcularSimilares(Modelo, idLivro, total=3)
        assert [i for i, _ in porBloco.get(idLivro, [])] == [i for i, _ in individual]
        for (_, a), (_, b) in zip(porBloco.get(idLivro, []), individual):
            assert a == pytest.approx(b, abs=1e-6)


def TestePosicaoComecaEmUmESequencial(Modelo):
    posicoes = [
        posicao
        for idLivro, posicao, _, _ in CalcularSimilaresEmBloco(Modelo, total=3, tamanhoBloco=5)
        if idLivro == 10
    ]
    assert posicoes == list(range(1, len(posicoes) + 1))
