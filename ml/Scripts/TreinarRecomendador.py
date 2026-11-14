"""treina o TF-IDF sobre o catalogo, salva o artefato e (opcional)
persiste o top-n de similaridade na tabela livros_similares."""

import argparse
from time import perf_counter

from Mineracao import RecomendacaoService
from Mineracao.Configuracao import GetConfiguracao


def Main() -> None:
    parser = argparse.ArgumentParser(description="treina o modelo de recomendacao por conteudo")
    configuracao = GetConfiguracao()

    parser.add_argument("--min-df", type=int, default=3, help="frequencia minima do termo")
    parser.add_argument("--max-df", type=float, default=0.5, help="frequencia maxima do termo")
    parser.add_argument("--max-features", type=int, default=120_000, help="tamanho do vocabulario")
    parser.add_argument("--ngram", type=int, default=1, help="tamanho maximo do n-grama")
    parser.add_argument(
        "--top-n", type=int, default=configuracao.TotalRecomendacoes, help="similares por livro"
    )
    parser.add_argument(
        "--persistir",
        action="store_true",
        help="calcula o top-n de todo o catalogo e grava em livros_similares",
    )
    parser.add_argument("--bloco", type=int, default=256, help="livros por bloco na persistencia")
    parser.add_argument(
        "--hibrido", action="store_true",
        help="completa categorias vazias usando o classificador treinado (opcional)",
    )
    parser.add_argument(
        "--limiar-categoria", type=float, default=0.75,
        help="confianca minima para inferir categoria ausente no modo hibrido",
    )
    argumentos = parser.parse_args()

    classificador = None
    if argumentos.hibrido:
        from Mineracao.ClassificacaoService import CarregarClassificador

        classificador = CarregarClassificador(configuracao.DiretorioArtefatos)
        if classificador is None:
            parser.error(
                "classificador nao encontrado: rode primeiro "
                "'python -m Scripts.TreinarClassificador' ou remova --hibrido"
            )
        if not 0 <= argumentos.limiar_categoria <= 1:
            parser.error("--limiar-categoria precisa estar entre 0 e 1")

    print("montando corpus e treinando tf-idf...")
    inicio = perf_counter()
    modelo = RecomendacaoService.TreinarModelo(
        minDf=argumentos.min_df,
        maxDf=argumentos.max_df,
        maxFeatures=argumentos.max_features,
        ngramMaximo=argumentos.ngram,
        classificador=classificador,
        limiarCategoria=argumentos.limiar_categoria,
    )
    print(
        f"treinado em {perf_counter() - inicio:.1f}s: "
        f"{modelo.GetTotalDeLivros()} livros x {modelo.GetTotalDeTermos()} termos"
    )

    if argumentos.hibrido:
        print(f"modo hibrido: {modelo.CategoriasInferidas} categorias ausentes inferidas")

    caminho = RecomendacaoService.SalvarModelo(modelo, configuracao.DiretorioArtefatos)
    print(f"artefato salvo em {caminho}")

    if argumentos.persistir:
        print("calculando similaridade de cosseno em blocos...")
        inicio = perf_counter()
        total = RecomendacaoService.PersistirSimilares(modelo, argumentos.top_n, argumentos.bloco)
        print(f"{total} pares gravados em livros_similares ({perf_counter() - inicio:.1f}s)")


if __name__ == "__main__":
    Main()
