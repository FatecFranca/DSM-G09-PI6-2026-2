"""Experimento de mineracao supervisionada para o catalogo NextRead.

Execute na pasta ml: python -m Scripts.TreinarClassificador
Nao altera tabelas nem dados operacionais do NextRead.
"""

import argparse
import json
from time import perf_counter

from Mineracao import ClassificacaoService
from Mineracao.Configuracao import GetConfiguracao


def Main() -> None:
    parser = argparse.ArgumentParser(
        description="classifica categorias de livros, avalia e compara selecao de atributos"
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
    argumentos = parser.parse_args()

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
    diretorio = GetConfiguracao().DiretorioArtefatos
    caminhoModelo = ClassificacaoService.SalvarClassificador(resultado.Modelo, diretorio)
    caminhoRelatorio = diretorio / ClassificacaoService.NomeDoArquivoDoRelatorio
    caminhoRelatorio.write_text(
        json.dumps(resultado.Relatorio, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    basico = resultado.Relatorio["baseline_sem_selecao"]
    selecionado = resultado.Relatorio["modelo_com_selecao"]
    print(f"Treino: {resultado.Relatorio['total_treino']} / teste: {resultado.Relatorio['total_teste']}")
    print(f"Categorias: {len(resultado.Relatorio['categorias'])}")
    print(f"F1 macro baseline: {basico['f1_macro']:.3f}")
    print(f"F1 macro com selecao: {selecionado['f1_macro']:.3f}")
    print(f"Modelo: {caminhoModelo}")
    print(f"Relatorio: {caminhoRelatorio}")
    print(f"Duracao: {perf_counter() - inicio:.1f}s")
    print("O modelo NAO modifica as recomendacoes existentes ate voce usar --hibrido.")


if __name__ == "__main__":
    Main()
