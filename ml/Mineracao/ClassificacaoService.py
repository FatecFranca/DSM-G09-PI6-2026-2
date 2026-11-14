"""Classificacao supervisionada de categoria principal para complementar o recomendador.

O alvo (categoria) NUNCA entra no texto usado como atributo. O split acontece
antes da vetorizacao e da selecao de atributos, para impedir vazamento de dados.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import joblib
import numpy as np
from sklearn.dummy import DummyClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.feature_selection import SelectKBest, chi2
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.neighbors import KNeighborsClassifier

from Mineracao.BancoDados import AbrirConexao

NomeDoArquivoDoClassificador = "modelo-categorias.joblib"
NomeDoArquivoDoRelatorio = "avaliacao-classificacao.json"
NomeDaFiguraDaMatriz = "matriz-confusao.png"

NomesDosModelos = (
    "classe_majoritaria", "naive_bayes", "naive_bayes_chi2", "knn_euclidiano_chi2", "knn_cosseno",
)
ModelosComSelecao = {"naive_bayes_chi2", "knn_euclidiano_chi2"}
VizinhosDoKnnCosseno = 25


def _CriarClassificador(nome: str, totalDeTreino: int):
    if nome == "classe_majoritaria":
        return DummyClassifier(strategy="most_frequent")
    if nome == "knn_euclidiano_chi2":
        # configuracao padrao do scikit-learn (k=5, distancia euclidiana), mantida para comparar
        return KNeighborsClassifier(n_neighbors=min(5, totalDeTreino))
    if nome == "knn_cosseno":
        # cosseno ignora o tamanho do vetor; o vizinho mais parecido vota com mais peso
        return KNeighborsClassifier(
            n_neighbors=min(VizinhosDoKnnCosseno, totalDeTreino),
            metric="cosine", weights="distance", algorithm="brute",
        )
    return MultinomialNB(alpha=1.0)


@dataclass
class ModeloClassificacao:
    Vetorizador: TfidfVectorizer
    Seletor: SelectKBest | None
    Classificador: MultinomialNB | KNeighborsClassifier
    Categorias: list[str]
    TreinadoEm: str


@dataclass
class ResultadoTreinamento:
    Modelo: ModeloClassificacao
    Relatorio: dict


def CategoriaPrincipal(categoria: str | None) -> str | None:
    """Transforma hierarquia 'Fiction, Fantasy' em rótulo 'Fiction'."""
    if not categoria or not categoria.strip():
        return None
    principal = categoria.split(",", 1)[0].strip()
    return principal or None


def MontarTextoDeClassificacao(
    titulo: str | None, autores: str | None, descricao: str | None
) -> str:
    """Sem categoria, pois ela e a variavel-resposta do aprendizado."""
    partes: list[str] = []
    if titulo and titulo.strip():
        partes.extend([titulo.strip()] * 2)
    if autores and autores.strip():
        partes.append(autores.strip())
    if descricao and descricao.strip():
        partes.append(descricao.strip())
    return " ".join(partes)


def CarregarExemplos() -> list[tuple[str, str]]:
    """Obtem texto e rotulo do Postgres existente; nenhuma alteracao no schema."""
    exemplos: list[tuple[str, str]] = []
    with AbrirConexao() as conexao, conexao.cursor(name="classificacao") as cursor:
        cursor.itersize = 5_000
        cursor.execute(
            "SELECT titulo, categoria, autores, descricao FROM livros ORDER BY id_livro"
        )
        for titulo, categoria, autores, descricao in cursor:
            rotulo = CategoriaPrincipal(categoria)
            texto = MontarTextoDeClassificacao(titulo, autores, descricao)
            if rotulo and texto:
                exemplos.append((texto, rotulo))
    return exemplos


def _Metrica(yReal: list[str], yPrevisto: np.ndarray, categorias: list[str]) -> dict:
    relatorio = classification_report(
        yReal, yPrevisto, labels=categorias, output_dict=True, zero_division=0
    )
    matriz = confusion_matrix(yReal, yPrevisto, labels=categorias)
    return {
        "acuracia": float(relatorio["accuracy"]),
        "f1_macro": float(relatorio["macro avg"]["f1-score"]),
        "f1_ponderado": float(relatorio["weighted avg"]["f1-score"]),
        "detalhes_por_categoria": {
            categoria: relatorio[categoria] for categoria in categorias
        },
        "matriz_confusao": matriz.tolist(),
    }


def TreinarComExemplos(
    exemplos: Iterable[tuple[str, str]],
    suporteMinimo: int = 30,
    maxCategorias: int = 20,
    tamanhoTeste: float = 0.2,
    maxFeatures: int = 40_000,
    kAtributos: int = 10_000,
    minDf: int = 2,
    randomState: int = 42,
) -> ResultadoTreinamento:
    """Compara baseline e selecao chi² em MESMO teste e treina artefato final.

    A selecao das categorias por frequencia define o escopo do estudo. Na pratica,
    classes raras ficam fora para evitar um classificador instavel. Nao e modelo
    multirrotulo: preve apenas a categoria principal.
    """
    if suporteMinimo < 2 or maxCategorias < 2 or kAtributos < 1 or maxFeatures < 1:
        raise ValueError("suporteMinimo >= 2, maxCategorias >= 2, kAtributos e maxFeatures >= 1")
    if minDf < 1 or not 0 < tamanhoTeste < 1:
        raise ValueError("minDf >= 1 e 0 < tamanhoTeste < 1 sao obrigatorios")

    validos = [(texto, categoria) for texto, categoria in exemplos if texto.strip() and categoria.strip()]
    contagem = Counter(categoria for _, categoria in validos)
    categorias = [
        nome for nome, total in sorted(contagem.items(), key=lambda par: (-par[1], par[0]))
        if total >= suporteMinimo
    ][:maxCategorias]
    if len(categorias) < 2:
        raise ValueError(
            "Nao ha pelo menos duas categorias com exemplos suficientes; "
            "ajuste --suporte-minimo ou carregue mais livros categorizados."
        )

    permitidas = set(categorias)
    filtrados = [(texto, categoria) for texto, categoria in validos if categoria in permitidas]
    textos, rotulos = zip(*filtrados)
    treinoX, testeX, treinoY, testeY = train_test_split(
        list(textos), list(rotulos), test_size=tamanhoTeste,
        random_state=randomState, stratify=list(rotulos),
    )

    def CriarVetorizador() -> TfidfVectorizer:
        return TfidfVectorizer(
            strip_accents="unicode", lowercase=True, stop_words="english",
            sublinear_tf=True, norm="l2", min_df=minDf,
            max_df=0.95, max_features=maxFeatures, dtype=np.float32,
        )

    # Fit SOMENTE no treino; nem o vocabulario nem o chi² veem o conjunto teste.
    vetorizador = CriarVetorizador()
    Xtreino = vetorizador.fit_transform(treinoX)
    Xteste = vetorizador.transform(testeX)

    kReal = min(kAtributos, Xtreino.shape[1])
    seletor = SelectKBest(score_func=chi2, k=kReal).fit(Xtreino, treinoY)
    XtreinoSelecionado = seletor.transform(Xtreino)
    XtesteSelecionado = seletor.transform(Xteste)

    # todos os modelos sao medidos no mesmo conjunto de teste
    metricas: dict[str, dict] = {}
    for nome in NomesDosModelos:
        usaSelecao = nome in ModelosComSelecao
        classificador = _CriarClassificador(nome, len(treinoY))
        classificador.fit(XtreinoSelecionado if usaSelecao else Xtreino, treinoY)
        previsto = classificador.predict(XtesteSelecionado if usaSelecao else Xteste)
        metricas[nome] = _Metrica(testeY, previsto, categorias)

    # a classe majoritaria e so a referencia minima, nunca vira artefato
    nomeDoMelhor = max(
        (nome for nome in NomesDosModelos if nome != "classe_majoritaria"),
        key=lambda nome: metricas[nome]["f1_macro"],
    )

    # O artefato operacional e treinado com todos os exemplos rotulados;
    # as metricas acima permanecem exclusivamente do conjunto de teste.
    vetorizadorFinal = CriarVetorizador()
    Xtodos = vetorizadorFinal.fit_transform(textos)
    seletorFinal = None
    if nomeDoMelhor in ModelosComSelecao:
        seletorFinal = SelectKBest(score_func=chi2, k=min(kAtributos, Xtodos.shape[1]))
        Xtodos = seletorFinal.fit_transform(Xtodos, rotulos)
    classificadorFinal = _CriarClassificador(nomeDoMelhor, len(rotulos))
    classificadorFinal.fit(Xtodos, rotulos)

    modelo = ModeloClassificacao(
        Vetorizador=vetorizadorFinal, Seletor=seletorFinal,
        Classificador=classificadorFinal, Categorias=categorias,
        TreinadoEm=datetime.now(timezone.utc).isoformat(timespec="seconds"),
    )
    relatorio = {
        "metodo": "TF-IDF comparando classe majoritaria, MultinomialNB (com e sem SelectKBest(chi2)) e KNN (euclidiano com chi2 e cosseno)",
        "alvo": "categoria principal; titulos/autores/descricao sao as entradas",
        "avaliacao": "holdout estratificado; preprocessadores ajustados somente no treino",
        "seed": randomState,
        "proporcao_teste": tamanhoTeste,
        "total_exemplos_originais_rotulados": len(validos),
        "total_exemplos_considerados": len(filtrados),
        "total_treino": len(treinoX),
        "total_teste": len(testeX),
        "categorias": categorias,
        "contagem_por_categoria": {categoria: contagem[categoria] for categoria in categorias},
        "termos_baseline": int(Xtreino.shape[1]),
        "termos_selecionados": int(kReal),
        "baseline_sem_selecao": metricas["naive_bayes"],
        "modelo_com_selecao": metricas["naive_bayes_chi2"],
        "comparacao": [
            {
                "modelo": nome,
                "acuracia": metricas[nome]["acuracia"],
                "f1_macro": metricas[nome]["f1_macro"],
                "f1_ponderado": metricas[nome]["f1_ponderado"],
            }
            for nome in NomesDosModelos
        ],
        "melhor_modelo": {"nome": nomeDoMelhor, **metricas[nomeDoMelhor]},
        "observacao": "Metricas referem-se somente ao teste. O artefato final foi reajustado em todos os registros rotulados.",
    }
    return ResultadoTreinamento(Modelo=modelo, Relatorio=relatorio)


def PreverCategorias(
    modelo: ModeloClassificacao, textos: list[str], limiar: float = 0.75,
    tamanhoBloco: int = 2_000,
) -> list[str | None]:
    """Inferencia em blocos; rejeita confianca baixa e textos vazios."""
    if not 0 <= limiar <= 1 or tamanhoBloco < 1:
        raise ValueError("limiar deve estar entre 0 e 1 e tamanhoBloco deve ser positivo")
    saida: list[str | None] = [None] * len(textos)
    indices = [indice for indice, texto in enumerate(textos) if texto.strip()]
    for inicio in range(0, len(indices), tamanhoBloco):
        blocoIndices = indices[inicio:inicio + tamanhoBloco]
        blocoTextos = [textos[i] for i in blocoIndices]
        X = modelo.Vetorizador.transform(blocoTextos)
        if modelo.Seletor is not None:
            X = modelo.Seletor.transform(X)
        probabilidades = modelo.Classificador.predict_proba(X)
        melhores = np.argmax(probabilidades, axis=1)
        for linha, indice in enumerate(blocoIndices):
            # Sem termos selecionados nao existe evidencia para uma previsao.
            if X.indptr[linha] == X.indptr[linha + 1]:
                continue
            chance = float(probabilidades[linha, melhores[linha]])
            if chance >= limiar:
                saida[indice] = str(modelo.Classificador.classes_[melhores[linha]])
    return saida


def SalvarClassificador(modelo: ModeloClassificacao, diretorio: Path) -> Path:
    diretorio.mkdir(parents=True, exist_ok=True)
    caminho = diretorio / NomeDoArquivoDoClassificador
    joblib.dump(modelo, caminho, compress=3)
    return caminho


def CarregarClassificador(diretorio: Path) -> ModeloClassificacao | None:
    caminho = diretorio / NomeDoArquivoDoClassificador
    if not caminho.is_file():
        return None
    # Carregue apenas artefatos gerados localmente/por fontes confiaveis (joblib/pickle).
    return joblib.load(caminho)
