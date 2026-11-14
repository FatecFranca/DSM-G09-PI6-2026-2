import pytest

from Mineracao.ClusterizacaoService import TreinarClusterizacao

Temas = {
    "Fantasy": "dragons wizards castles magical enchanted realm adventure",
    "Cooking": "recipes kitchen baking vegetables meals restaurant cookbook",
    "Science": "quantum research physics experiment laboratory scientific theory",
}


def _Corpus() -> tuple[list[str], list[str]]:
    textos: list[str] = []
    generos: list[str] = []
    for genero, texto in Temas.items():
        for i in range(18):
            textos.append(f"{texto} volume{i}")
            generos.append(genero)
    return textos, generos


def _Treinar(textos, generos, **ajustes):
    parametros = dict(k=3, valoresDeK=(2, 3, 4), componentes=5, minDf=1, tamanhoAmostra=100)
    parametros.update(ajustes)
    return TreinarClusterizacao(textos, generos, **parametros)


@pytest.fixture(scope="module")
def Resultado():
    textos, generos = _Corpus()
    return _Treinar(textos, generos)


def TesteClustersSeparamTemas(Resultado):
    relatorio = Resultado.Relatorio
    assert relatorio["validacao_externa"]["pureza"] == 1.0
    assert sorted(cluster["genero_dominante"] for cluster in relatorio["clusters"]) == sorted(Temas)


def TesteTermosDoClusterVemDoTema(Resultado):
    cluster = next(c for c in Resultado.Relatorio["clusters"] if c["genero_dominante"] == "Cooking")
    assert {"recipes", "kitchen"} & set(cluster["termos"])
    assert len(cluster["termos"]) <= 10


def TesteVarreduraTemUmaLinhaPorK(Resultado):
    varredura = Resultado.Relatorio["varredura"]
    assert [linha["k"] for linha in varredura] == [2, 3, 4]
    assert all(-1 <= linha["silhouette"] <= 1 for linha in varredura)
    inercias = [linha["inercia"] for linha in varredura]
    assert inercias[0] > inercias[-1]


def TesteGeneroAusenteNaoEntraNaValidacao():
    textos, generos = _Corpus()
    generos = [genero if indice % 2 == 0 else None for indice, genero in enumerate(generos)]
    relatorio = _Treinar(textos, generos).Relatorio
    assert relatorio["validacao_externa"]["livros_com_genero"] == len(textos) // 2
    assert sum(cluster["tamanho"] for cluster in relatorio["clusters"]) == len(textos)


def TesteComponentesLimitadosAoVocabulario():
    textos, generos = _Corpus()
    relatorio = _Treinar(textos, generos, componentes=500).Relatorio
    assert relatorio["componentes"] < relatorio["total_termos"]


def TesteKInvalidoGeraErro():
    textos, generos = _Corpus()
    with pytest.raises(ValueError):
        _Treinar(textos, generos, k=1)
    with pytest.raises(ValueError):
        _Treinar(textos, generos, k=len(textos) + 1)


def TesteTextosVaziosSaoIgnorados():
    textos, generos = _Corpus()
    resultado = _Treinar(textos + ["", "   "], generos + ["Fantasy", None])
    assert resultado.Relatorio["total_livros"] == len(textos)
    assert len(resultado.Rotulos) == len(textos)
