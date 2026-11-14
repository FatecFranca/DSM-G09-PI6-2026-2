"""Clusterizacao nao supervisionada do catalogo: TF-IDF -> SVD -> KMeans.

A categoria nao entra no texto nem no agrupamento. Ela so aparece depois,
para conferir se os grupos descobertos lembram os generos (validacao externa).
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np
from sklearn.cluster import MiniBatchKMeans
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import adjusted_rand_score, normalized_mutual_info_score, silhouette_score
from sklearn.preprocessing import Normalizer

from Mineracao.BancoDados import AbrirConexao
from Mineracao.ClassificacaoService import CategoriaPrincipal, MontarTextoDeClassificacao

NomeDoArquivoDoRelatorio = "avaliacao-clusterizacao.json"
NomeDaFiguraDasCurvas = "curvas-k.png"


@dataclass
class ResultadoClusterizacao:
    Relatorio: dict
    Rotulos: np.ndarray


def CarregarTextosParaClusterizar() -> tuple[list[str], list[str | None]]:
    textos: list[str] = []
    generos: list[str | None] = []
    with AbrirConexao() as conexao, conexao.cursor(name="clusterizacao") as cursor:
        cursor.itersize = 5_000
        cursor.execute("SELECT titulo, categoria, autores, descricao FROM livros ORDER BY id_livro")
        for titulo, categoria, autores, descricao in cursor:
            texto = MontarTextoDeClassificacao(titulo, autores, descricao)
            if texto:
                textos.append(texto)
                generos.append(CategoriaPrincipal(categoria))
    return textos, generos


def _AgruparEmK(matriz: np.ndarray, k: int, randomState: int) -> MiniBatchKMeans:
    return MiniBatchKMeans(n_clusters=k, n_init=3, batch_size=4096, random_state=randomState).fit(matriz)


def _CompararComGeneros(rotulos: np.ndarray, generos: list[str | None], k: int) -> tuple[list[dict], dict]:
    indicesComGenero = [indice for indice, genero in enumerate(generos) if genero]
    clusters: list[dict] = []
    acertosDaPureza = 0

    for cluster in range(k):
        membros = np.flatnonzero(rotulos == cluster)
        contagem = Counter(generos[indice] for indice in membros if generos[indice])
        comGenero = sum(contagem.values())
        dominante, total = contagem.most_common(1)[0] if contagem else (None, 0)
        acertosDaPureza += total
        clusters.append({
            "cluster": cluster,
            "tamanho": int(membros.size),
            "genero_dominante": dominante,
            "proporcao_genero": total / comGenero if comGenero else 0.0,
            "livros_com_genero": comGenero,
        })

    reais = [generos[indice] for indice in indicesComGenero]
    previstos = rotulos[indicesComGenero]
    validacao = {
        "livros_com_genero": len(indicesComGenero),
        "pureza": acertosDaPureza / len(indicesComGenero) if indicesComGenero else 0.0,
        "ari": float(adjusted_rand_score(reais, previstos)) if indicesComGenero else 0.0,
        "nmi": float(normalized_mutual_info_score(reais, previstos)) if indicesComGenero else 0.0,
    }
    return clusters, validacao


def TreinarClusterizacao(
    textos: Sequence[str],
    generos: Sequence[str | None],
    k: int = 20,
    valoresDeK: Sequence[int] = (10, 15, 20, 25, 30, 40),
    componentes: int = 100,
    minDf: int = 2,
    maxFeatures: int = 40_000,
    tamanhoAmostra: int = 10_000,
    termosPorCluster: int = 10,
    randomState: int = 42,
) -> ResultadoClusterizacao:
    if len(textos) != len(generos):
        raise ValueError("textos e generos precisam ter o mesmo tamanho")

    pares = [(texto, genero) for texto, genero in zip(textos, generos) if texto and texto.strip()]
    if not 2 <= k < len(pares):
        raise ValueError(f"k precisa estar entre 2 e {len(pares) - 1} (livros com texto)")
    textosValidos = [texto for texto, _ in pares]
    generosValidos = [genero for _, genero in pares]

    vetorizador = TfidfVectorizer(
        strip_accents="unicode", lowercase=True, stop_words="english",
        sublinear_tf=True, norm="l2", min_df=minDf, max_df=0.95,
        max_features=maxFeatures, dtype=np.float32,
    )
    tfidf = vetorizador.fit_transform(textosValidos)

    # o svd exige menos componentes que termos
    componentesReais = max(1, min(componentes, tfidf.shape[1] - 1))
    svd = TruncatedSVD(n_components=componentesReais, random_state=randomState)
    reduzida = Normalizer().fit_transform(svd.fit_transform(tfidf))

    gerador = np.random.default_rng(randomState)
    amostra = gerador.choice(len(textosValidos), min(tamanhoAmostra, len(textosValidos)), replace=False)

    varredura = []
    for valor in sorted(set(valoresDeK)):
        if not 2 <= valor < len(amostra):
            continue
        modelo = _AgruparEmK(reduzida, valor, randomState)
        varredura.append({
            "k": valor,
            "inercia": float(modelo.inertia_),
            "silhouette": float(silhouette_score(reduzida[amostra], modelo.labels_[amostra])),
        })

    kmeans = _AgruparEmK(reduzida, k, randomState)
    rotulos = kmeans.labels_

    # volta os centroides para o espaco de termos e pega os mais fortes
    centroidesEmTermos = svd.inverse_transform(kmeans.cluster_centers_)
    vocabulario = vetorizador.get_feature_names_out()
    clusters, validacao = _CompararComGeneros(rotulos, generosValidos, k)
    for cluster in clusters:
        pesos = centroidesEmTermos[cluster["cluster"]]
        melhores = np.argsort(-pesos)[:termosPorCluster]
        cluster["termos"] = [str(vocabulario[indice]) for indice in melhores]
    clusters.sort(key=lambda cluster: -cluster["tamanho"])

    relatorio = {
        "metodo": "TF-IDF (titulo, autores, descricao) -> TruncatedSVD -> normalizacao L2 -> MiniBatchKMeans",
        "seed": randomState,
        "total_livros": len(textosValidos),
        "total_termos": int(tfidf.shape[1]),
        "componentes": componentesReais,
        "variancia_explicada": float(svd.explained_variance_ratio_.sum()),
        "tamanho_amostra_silhouette": int(len(amostra)),
        "varredura": varredura,
        "k": k,
        "inercia": float(kmeans.inertia_),
        "silhouette": float(silhouette_score(reduzida[amostra], rotulos[amostra])),
        "validacao_externa": validacao,
        "clusters": clusters,
    }
    return ResultadoClusterizacao(Relatorio=relatorio, Rotulos=rotulos)
