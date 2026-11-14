"""Experimento de mineracao nao supervisionada: agrupa os livros por conteudo.

Execute na pasta ml: python -m Scripts.TreinarClusterizacao
Nao altera tabelas nem dados operacionais do NextRead.
"""

import argparse
import json
from time import perf_counter

from Mineracao import ClusterizacaoService
from Mineracao.Configuracao import GetConfiguracao
from Mineracao.GraficosService import SalvarCurvasDeK


def Main(argv: list[str] | None = None) -> dict:
    parser = argparse.ArgumentParser(description="agrupa os livros com kmeans sobre o tf-idf reduzido")
    parser.add_argument("--k", type=int, default=20, help="numero de clusters do modelo final")
    parser.add_argument("--valores-de-k", type=int, nargs="+", default=[10, 15, 20, 25, 30, 40],
                        help="valores de k avaliados no cotovelo e no silhouette")
    parser.add_argument("--componentes", type=int, default=100, help="dimensoes do truncated svd")
    parser.add_argument("--amostra", type=int, default=10_000, help="livros usados no silhouette")
    argumentos = parser.parse_args(argv)

    inicio = perf_counter()
    print("carregando textos do banco...")
    textos, generos = ClusterizacaoService.CarregarTextosParaClusterizar()
    resultado = ClusterizacaoService.TreinarClusterizacao(
        textos, generos, k=argumentos.k, valoresDeK=argumentos.valores_de_k,
        componentes=argumentos.componentes, tamanhoAmostra=argumentos.amostra,
    )
    relatorio = resultado.Relatorio

    diretorio = GetConfiguracao().DiretorioArtefatos
    diretorio.mkdir(parents=True, exist_ok=True)
    caminhoRelatorio = diretorio / ClusterizacaoService.NomeDoArquivoDoRelatorio
    caminhoRelatorio.write_text(json.dumps(relatorio, indent=2, ensure_ascii=False), encoding="utf-8")
    varredura = relatorio["varredura"]
    caminhoFigura = SalvarCurvasDeK(
        [linha["k"] for linha in varredura],
        [linha["inercia"] for linha in varredura],
        [linha["silhouette"] for linha in varredura],
        diretorio / ClusterizacaoService.NomeDaFiguraDasCurvas,
    )

    print(f"Livros: {relatorio['total_livros']} / termos: {relatorio['total_termos']}")
    print(f"SVD: {relatorio['componentes']} componentes, "
          f"{relatorio['variancia_explicada']:.1%} da variancia")
    print(f"{'k':>4}{'inercia':>12}{'silhouette':>12}")
    for linha in varredura:
        print(f"{linha['k']:>4}{linha['inercia']:>12.0f}{linha['silhouette']:>12.3f}")
    validacao = relatorio["validacao_externa"]
    print(f"Modelo final k={relatorio['k']}: silhouette {relatorio['silhouette']:.3f}")
    print(f"Contra os generos ({validacao['livros_com_genero']} livros): "
          f"pureza {validacao['pureza']:.3f}, ARI {validacao['ari']:.3f}, NMI {validacao['nmi']:.3f}")
    for cluster in relatorio["clusters"]:
        genero = cluster["genero_dominante"] or "-"
        print(f"  #{cluster['cluster']:<3}{cluster['tamanho']:>6} livros  "
              f"{genero} ({cluster['proporcao_genero']:.0%})  {', '.join(cluster['termos'][:6])}")
    print(f"Relatorio: {caminhoRelatorio}")
    print(f"Curvas de k: {caminhoFigura}")
    print(f"Duracao: {perf_counter() - inicio:.1f}s")
    return relatorio


if __name__ == "__main__":
    Main()
