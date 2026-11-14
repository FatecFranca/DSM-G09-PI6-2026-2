"""Experimento de mineracao supervisionada para o catalogo NextRead.

Execute na pasta ml: python -m Scripts.TreinarClassificador
Nao altera tabelas nem dados operacionais do NextRead.
"""

import argparse
import json
from time import perf_counter

from Mineracao import ClassificacaoService
from Mineracao.Configuracao import GetConfiguracao
from Mineracao.GraficosService import SalvarMatrizDeConfusao


def Main(argv: list[str] | None = None) -> dict:
    parser = argparse.ArgumentParser(
        description="classifica o genero dos livros e compara modelos no mesmo teste"
    )
    parser.add_argument("--suporte-minimo", type=int, default=30,
                        help="minimo de exemplos por categoria")
    parser.add_argument("--max-categorias", type=int, default=20,
                        help="maximo de categorias (as mais frequentes)")
    parser.add_argument("--max-features", type=int, default=40_000,
                        help="maximo de termos no TF-IDF")
    parser.add_argument("--k-atributos", type=int, default=10_000,
                        help="quantidade de termos selecionados pelo chi-quadrado")
    parser.add_argument("--min-df", type=int, default=2,
                        help="frequencia minima dos termos")
    parser.add_argument("--teste", type=float, default=0.2,
                        help="proporcao reservada exclusivamente a avaliacao")
    argumentos = parser.parse_args(argv)

    inicio = perf_counter()
    print("carregando livros rotulados do banco...")
    exemplos = ClassificacaoService.CarregarExemplos()
    resultado = ClassificacaoService.TreinarComExemplos(
        exemplos, suporteMinimo=argumentos.suporte_minimo,
        maxCategorias=argumentos.max_categorias,
        tamanhoTeste=argumentos.teste,
        maxFeatures=argumentos.max_features, kAtributos=argumentos.k_atributos,
        minDf=argumentos.min_df,
    )
    relatorio = resultado.Relatorio
    melhor = relatorio["melhor_modelo"]

    diretorio = GetConfiguracao().DiretorioArtefatos
    caminhoModelo = ClassificacaoService.SalvarClassificador(resultado.Modelo, diretorio)
    caminhoRelatorio = diretorio / ClassificacaoService.NomeDoArquivoDoRelatorio
    caminhoRelatorio.write_text(json.dumps(relatorio, indent=2, ensure_ascii=False), encoding="utf-8")
    caminhoFigura = SalvarMatrizDeConfusao(
        melhor["matriz_confusao"], relatorio["categorias"],
        diretorio / ClassificacaoService.NomeDaFiguraDaMatriz,
    )

    print(f"Treino: {relatorio['total_treino']} / teste: {relatorio['total_teste']}")
    print(f"Categorias: {len(relatorio['categorias'])}")
    print(f"{'modelo':<22}{'acuracia':>10}{'f1 macro':>10}")
    for linha in relatorio["comparacao"]:
        print(f"{linha['modelo']:<22}{linha['acuracia']:>10.3f}{linha['f1_macro']:>10.3f}")
    print(f"Melhor modelo (artefato): {melhor['nome']}")
    print(f"Modelo: {caminhoModelo}")
    print(f"Relatorio: {caminhoRelatorio}")
    print(f"Matriz de confusao: {caminhoFigura}")
    print(f"Duracao: {perf_counter() - inicio:.1f}s")
    print("O modelo NAO modifica as recomendacoes existentes ate voce usar --hibrido.")
    return relatorio


if __name__ == "__main__":
    Main()
