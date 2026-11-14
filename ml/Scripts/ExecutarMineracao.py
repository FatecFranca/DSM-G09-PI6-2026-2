"""Roda os dois experimentos de mineracao de dados de uma vez.

Execute na pasta ml: python -m Scripts.ExecutarMineracao
Supervisionado (classificador de genero) + nao supervisionado (kmeans).
"""

from time import perf_counter

from Scripts import TreinarClassificador, TreinarClusterizacao


def Main() -> None:
    inicio = perf_counter()

    print("=== 1/2 aprendizado supervisionado: classificacao de genero ===")
    classificacao = TreinarClassificador.Main([])

    print("\n=== 2/2 aprendizado nao supervisionado: clusterizacao ===")
    clusterizacao = TreinarClusterizacao.Main([])

    melhor = classificacao["melhor_modelo"]
    validacao = clusterizacao["validacao_externa"]
    print("\n=== resumo ===")
    print(f"classificador ({melhor['nome']}): acuracia {melhor['acuracia']:.3f}, "
          f"f1 macro {melhor['f1_macro']:.3f}")
    print(f"kmeans (k={clusterizacao['k']}): silhouette {clusterizacao['silhouette']:.3f}, "
          f"pureza {validacao['pureza']:.3f}, NMI {validacao['nmi']:.3f}")
    print(f"tempo total: {perf_counter() - inicio:.1f}s")


if __name__ == "__main__":
    Main()
