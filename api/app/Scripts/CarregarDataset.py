"""ingestao do BooksDataset.csv para a tabela livros."""

import argparse
from pathlib import Path
from time import perf_counter

from sqlalchemy import text

from app.Core.BancoDados import CriarSessao
from app.Core.Configuracao import GetConfiguracao
from app.Services.IngestaoService import CarregarDataset

Configuracao = GetConfiguracao()


def ContarLivros() -> int:
    with CriarSessao() as sessao:
        return sessao.scalar(text("SELECT COUNT(*) FROM livros")) or 0


def Main() -> None:
    parser = argparse.ArgumentParser(description="carrega o dataset de livros no postgres")
    parser.add_argument("--caminho", type=Path, default=None, help="csv de entrada")
    parser.add_argument("--lote", type=int, default=20_000, help="linhas lidas por vez")
    parser.add_argument(
        "--limpar", action="store_true", help="TRUNCATE em livros antes de carregar"
    )
    parser.add_argument(
        "--manter-duplicados",
        action="store_true",
        help="nao descarta titulos repetidos do mesmo autor",
    )
    argumentos = parser.parse_args()

    caminho = argumentos.caminho or Configuracao.GetCaminhoDatasetAbsoluto()

    jaExistem = ContarLivros()
    if jaExistem and not argumentos.limpar:
        print(f"a tabela livros ja tem {jaExistem} registros.")
        print("use --limpar para recarregar do zero, ou remova este passo.")
        return

    print(f"lendo {caminho}")
    inicio = perf_counter()
    resumo = CarregarDataset(
        caminho=caminho,
        tamanhoLote=argumentos.lote,
        limparAntes=argumentos.limpar,
        removerDuplicados=not argumentos.manter_duplicados,
    )
    duracao = perf_counter() - inicio

    for chave, valor in resumo.items():
        print(f"{chave}: {valor}")
    print(f"tempo: {duracao:.1f}s")


if __name__ == "__main__":
    Main()
