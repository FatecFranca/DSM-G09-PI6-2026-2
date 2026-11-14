"""Avaliacao exploratoria do modelo de recomendacao salvo, sem mudar o banco."""

import argparse
import json

from Mineracao.AvaliacaoService import AvaliarRecomendador, CarregarCategorias
from Mineracao.Configuracao import GetConfiguracao
from Mineracao.RecomendacaoService import CarregarModelo


def Main():
    parser = argparse.ArgumentParser(description="avalia concordancia de categorias no top-N")
    parser.add_argument("--amostra", type=int, default=300)
    parser.add_argument("--top-n", type=int, default=10)
    args = parser.parse_args()
    diretorio = GetConfiguracao().DiretorioArtefatos
    modelo = CarregarModelo(diretorio)
    if modelo is None:
        parser.error("modelo TF-IDF nao encontrado; rode TreinarRecomendador antes")
    categorias = CarregarCategorias()
    resultado = AvaliarRecomendador(modelo, categorias, args.amostra, args.top_n)
    caminho = diretorio / "avaliacao-recomendacoes.json"
    caminho.write_text(json.dumps(resultado, indent=2, ensure_ascii=False), encoding="utf-8")
    taxa = resultado["taxa_coincidencia_categoria"]
    print(f"Livros avaliados: {resultado['amostra_avaliada']}")
    print(f"Cobertura: {resultado['cobertura_na_amostra']:.1%}")
    print(f"Coincidencia de categoria (proxy): {taxa:.1%}" if taxa is not None else "Sem pares rotulados")
    print(f"Relatorio: {caminho}")


if __name__ == "__main__":
    Main()
