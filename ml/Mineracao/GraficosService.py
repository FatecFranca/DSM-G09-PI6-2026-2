from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np


def SalvarMatrizDeConfusao(matriz: list[list[int]], categorias: list[str], caminho: Path) -> Path:
    valores = np.asarray(matriz, dtype=float)
    totaisPorLinha = valores.sum(axis=1, keepdims=True)
    # cada linha vira proporcao do genero real; linha sem exemplos fica zerada
    proporcoes = np.divide(valores, totaisPorLinha, out=np.zeros_like(valores), where=totaisPorLinha > 0)

    tamanho = max(6, len(categorias) * 0.5)
    figura, eixo = plt.subplots(figsize=(tamanho + 2, tamanho))
    imagem = eixo.imshow(proporcoes, cmap="Blues", vmin=0, vmax=1)
    eixo.set_xticks(range(len(categorias)), categorias, rotation=60, ha="right", fontsize=8)
    eixo.set_yticks(range(len(categorias)), categorias, fontsize=8)
    eixo.set_xlabel("gênero previsto")
    eixo.set_ylabel("gênero real")
    eixo.set_title("Matriz de confusão (proporção por gênero real)")
    figura.colorbar(imagem, ax=eixo, fraction=0.046)
    figura.tight_layout()

    return _Salvar(figura, caminho)


def SalvarCurvasDeK(
    ks: list[int], inercias: list[float], silhouettes: list[float], caminho: Path
) -> Path:
    figura, (eixoInercia, eixoSilhouette) = plt.subplots(1, 2, figsize=(11, 4))

    eixoInercia.plot(ks, inercias, marker="o")
    eixoInercia.set_title("Método do cotovelo")
    eixoInercia.set_xlabel("k (número de clusters)")
    eixoInercia.set_ylabel("inércia")

    eixoSilhouette.plot(ks, silhouettes, marker="o", color="tab:orange")
    eixoSilhouette.set_title("Silhouette (amostra)")
    eixoSilhouette.set_xlabel("k (número de clusters)")
    eixoSilhouette.set_ylabel("silhouette")

    figura.tight_layout()
    return _Salvar(figura, caminho)


def _Salvar(figura, caminho: Path) -> Path:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    figura.savefig(caminho, dpi=120)
    plt.close(figura)
    return caminho
