import numpy as np
import pytest

from Mineracao.AvaliacaoService import AvaliarRecomendador
from Mineracao.RecomendacaoService import TreinarModeloComCorpus


def TesteAvaliacaoNaoAlteraRecomendacoes():
    ids = np.array([1, 2, 3, 4], dtype=np.int64)
    textos = [
        "magic dragon fantasy", "magic dragon hero fantasy",
        "baking recipe cooking", "baking recipe meals cooking",
    ]
    modelo = TreinarModeloComCorpus(ids, textos, minDf=1, maxDf=1.0)
    categorias = {1: "Fantasy", 2: "Fantasy", 3: "Cooking", 4: "Cooking"}
    aval = AvaliarRecomendador(modelo, categorias, amostra=4, topN=1)
    assert aval["amostra_avaliada"] == 4
    assert aval["total_recomendacoes"] == 4
    assert aval["cobertura_na_amostra"] == 1
    assert aval["taxa_coincidencia_categoria"] == 1
    assert aval["pares_com_categoria_conhecida"] == 4


def TesteAvaliacaoSemRotulosFalha():
    modelo = TreinarModeloComCorpus(np.array([1]), ["livro"], minDf=1, maxDf=1.0)
    with pytest.raises(ValueError, match="nenhum id"):
        AvaliarRecomendador(modelo, {}, amostra=1)
