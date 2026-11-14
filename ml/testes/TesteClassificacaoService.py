import json

import pytest

from Mineracao.ClassificacaoService import (
    CarregarClassificador,
    CategoriaPrincipal,
    MontarTextoDeClassificacao,
    PreverCategorias,
    SalvarClassificador,
    TreinarComExemplos,
)
from Mineracao.RecomendacaoService import (
    MontarCorpusComClassificacao,
    MontarTextoDeConteudo,
    TreinarModeloComCorpus,
    CalcularSimilares,
)


def _Exemplos():
    dados = {
        "Fantasy": "dragons wizards castles magical enchanted realm adventure",
        "Cooking": "recipes kitchen baking vegetables meals restaurant cookbook",
        "Science": "quantum research physics experiment laboratory scientific theory",
    }
    return [
        (f"{texto} {texto} volume{i} ", categoria)
        for categoria, texto in dados.items()
        for i in range(18)
    ]


@pytest.fixture(scope="module")
def Treino():
    return TreinarComExemplos(
        _Exemplos(), suporteMinimo=10, maxCategorias=3,
        minDf=1, maxFeatures=200, kAtributos=12,
    )


def TesteCategoriaPrincipalSuportaHierarquiaENulos():
    assert CategoriaPrincipal(" Fantasy, Adventure ") == "Fantasy"
    assert CategoriaPrincipal("Science") == "Science"
    assert CategoriaPrincipal(None) is None
    assert CategoriaPrincipal(" , ") is None


def TesteTextoDeTreinoNaoIncluiCategoria():
    texto = MontarTextoDeClassificacao("O livro", "Fulano", "Uma aventura")
    assert "O livro" in texto and "Fulano" in texto
    assert "Fantasy" not in texto
    assert MontarTextoDeClassificacao(None, None, None) == ""


def TesteTreinoAvaliaBaselineESelecaoSemVazamento(Treino):
    relatorio = Treino.Relatorio
    assert relatorio["total_exemplos_considerados"] == 54
    assert relatorio["total_treino"] + relatorio["total_teste"] == 54
    assert relatorio["termos_selecionados"] == 12
    assert relatorio["termos_baseline"] > relatorio["termos_selecionados"]
    assert len(relatorio["categorias"]) == 3
    assert 0 <= relatorio["baseline_sem_selecao"]["acuracia"] <= 1
    assert 0 <= relatorio["modelo_com_selecao"]["f1_macro"] <= 1
    assert sum(sum(linha) for linha in relatorio["modelo_com_selecao"]["matriz_confusao"]) == relatorio["total_teste"]
    assert len(json.dumps(relatorio)) > 0


def TestePrevisaoBloqueiaTextoVazioEMantemCategoriasConhecidas(Treino):
    respostas = PreverCategorias(
        Treino.Modelo, ["magical wizards realm", "", "recipes restaurant vegetables"],
        limiar=0, tamanhoBloco=1,
    )
    assert respostas == ["Fantasy", None, "Cooking"]


def TestePrevisaoValidaLimiar(Treino):
    with pytest.raises(ValueError):
        PreverCategorias(Treino.Modelo, ["teste"], limiar=1.1)


def TesteNaoTreinaSemDuasCategorias():
    with pytest.raises(ValueError, match="duas categorias"):
        TreinarComExemplos([("fantasy dragon", "Fantasy")] * 12, suporteMinimo=10)


def TesteModeloSerializaERecarrega(Treino, tmp_path):
    caminho = SalvarClassificador(Treino.Modelo, tmp_path)
    assert caminho.is_file()
    novo = CarregarClassificador(tmp_path)
    assert novo is not None
    assert PreverCategorias(novo, ["magical wizards realm"], limiar=0) == ["Fantasy"]


def TesteCorpusHibridoRespeitaCategoriaExistente(Treino):
    registros = [
        (10, "Magical Castle", None, "", "magical wizards realm"),
        (20, "Cooking Book", "Cooking, Meals", "", "magical wizards realm"),
        (30, "xyzunseenword", None, None, None),
    ]
    ids, textos, inferidas = MontarCorpusComClassificacao(registros, Treino.Modelo, limiar=0)
    assert ids.tolist() == [10, 20, 30]
    assert inferidas == 1  # titulo sem termos conhecidos: nenhuma classe inferida
    assert "Fantasy" in textos[0]
    assert textos[1] == MontarTextoDeConteudo("Cooking Book", "Cooking, Meals", "", "magical wizards realm")
    assert "Cooking" in textos[1]
    modelo = TreinarModeloComCorpus(ids, textos, minDf=1, maxDf=1.0)
    assert modelo.GetTotalDeLivros() == 3
    assert 10 not in [idLivro for idLivro, _ in CalcularSimilares(modelo, 10)]


def TesteComparacaoTemOsCincoModelosNoMesmoTeste(Treino):
    comparacao = Treino.Relatorio["comparacao"]
    assert [linha["modelo"] for linha in comparacao] == [
        "classe_majoritaria", "naive_bayes", "naive_bayes_chi2", "knn_euclidiano_chi2", "knn_cosseno",
    ]
    for linha in comparacao:
        assert 0 <= linha["acuracia"] <= 1
        assert 0 <= linha["f1_macro"] <= 1


def TesteKnnFuncionaComMenosLivrosQueVizinhos():
    # 3 generos x 10 livros: o treino fica com 24, menos que os 25 vizinhos do knn
    poucos = [exemplo for indice, exemplo in enumerate(_Exemplos()) if indice % 18 < 10]
    resultado = TreinarComExemplos(poucos, suporteMinimo=5, maxCategorias=3, minDf=1, kAtributos=12)
    nomes = [linha["modelo"] for linha in resultado.Relatorio["comparacao"]]
    assert "knn_cosseno" in nomes


def TesteMelhorModeloNuncaEhClasseMajoritaria(Treino):
    melhor = Treino.Relatorio["melhor_modelo"]
    assert melhor["nome"] != "classe_majoritaria"
    assert sum(sum(linha) for linha in melhor["matriz_confusao"]) == Treino.Relatorio["total_teste"]


def TesteArtefatoSemSeletorPreveCategorias():
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.neighbors import KNeighborsClassifier

    from Mineracao.ClassificacaoService import ModeloClassificacao

    textos, rotulos = zip(*_Exemplos())
    vetorizador = TfidfVectorizer()
    classificador = KNeighborsClassifier(n_neighbors=5, metric="cosine", algorithm="brute")
    classificador.fit(vetorizador.fit_transform(textos), rotulos)
    modelo = ModeloClassificacao(
        Vetorizador=vetorizador, Seletor=None, Classificador=classificador,
        Categorias=sorted(set(rotulos)), TreinadoEm="teste",
    )
    respostas = PreverCategorias(modelo, ["magical wizards realm", "", "quantum physics"], limiar=0)
    assert respostas == ["Fantasy", None, "Science"]
