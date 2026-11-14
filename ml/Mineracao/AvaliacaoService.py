"""Avaliacao exploratoria de recomendacoes por coincidencia de categoria.

Nao mede satisfacao dos usuarios. Coincidencia de categoria e somente uma proxy
interpretavel para estudo academico e comparacao de configuracoes do pipeline.
"""

from __future__ import annotations

import random

from Mineracao.BancoDados import AbrirConexao
from Mineracao.ClassificacaoService import CategoriaPrincipal
from Mineracao.RecomendacaoService import CalcularSimilares, ModeloRecomendacao


def CarregarCategorias() -> dict[int, str]:
    categorias = {}
    with AbrirConexao() as conexao, conexao.cursor(name="avaliacao_categorias") as cursor:
        cursor.itersize = 5_000
        cursor.execute("SELECT id_livro, categoria FROM livros")
        for idLivro, categoria in cursor:
            principal = CategoriaPrincipal(categoria)
            if principal:
                categorias[int(idLivro)] = principal
    return categorias


def AvaliarRecomendador(
    modelo: ModeloRecomendacao,
    categorias: dict[int, str],
    amostra: int = 300,
    topN: int = 10,
    seed: int = 42,
) -> dict:
    if amostra < 1 or topN < 1:
        raise ValueError("amostra e topN devem ser positivos")
    validos = sorted(int(idLivro) for idLivro in modelo.Ids if int(idLivro) in categorias)
    if not validos:
        raise ValueError("nenhum id do modelo possui categoria rotulada no banco")
    idsAvaliados = random.Random(seed).sample(validos, min(amostra, len(validos)))

    paresComCategoria = 0
    paresMesmaCategoria = 0
    comAlgumaRecomendacao = 0
    totalRecomendacoes = 0

    for idLivro in idsAvaliados:
        similares = CalcularSimilares(modelo, idLivro, total=topN)
        if similares:
            comAlgumaRecomendacao += 1
        totalRecomendacoes += len(similares)
        for idSimilar, _ in similares:
            if idSimilar in categorias:
                paresComCategoria += 1
                if categorias[idLivro] == categorias[idSimilar]:
                    paresMesmaCategoria += 1

    return {
        "metrica": "taxa de coincidencia da categoria principal dos livros recomendados",
        "tipo": "proxy exploratoria, nao Precision@K com relevancia julgada por usuarios",
        "amostra_solicitada": amostra,
        "amostra_avaliada": len(idsAvaliados),
        "top_n": topN,
        "seed": seed,
        "livros_com_recomendacoes": comAlgumaRecomendacao,
        "cobertura_na_amostra": comAlgumaRecomendacao / len(idsAvaliados),
        "total_recomendacoes": totalRecomendacoes,
        "pares_com_categoria_conhecida": paresComCategoria,
        "pares_mesma_categoria": paresMesmaCategoria,
        "taxa_coincidencia_categoria": (
            paresMesmaCategoria / paresComCategoria if paresComCategoria else None
        ),
    }
