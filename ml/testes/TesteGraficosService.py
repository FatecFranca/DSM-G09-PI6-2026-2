from Mineracao.GraficosService import SalvarCurvasDeK, SalvarMatrizDeConfusao


def _EhPng(caminho) -> bool:
    return caminho.read_bytes()[:4] == b"\x89PNG"


def TesteMatrizDeConfusaoViraPng(tmp_path):
    caminho = SalvarMatrizDeConfusao(
        [[8, 2], [1, 9]], ["Fiction", "Cooking"], tmp_path / "matriz.png"
    )
    assert _EhPng(caminho)


def TesteMatrizComLinhaZeradaNaoQuebra(tmp_path):
    caminho = SalvarMatrizDeConfusao([[0, 0], [1, 9]], ["A", "B"], tmp_path / "zerada.png")
    assert _EhPng(caminho)


def TesteCurvasDeKViramPng(tmp_path):
    caminho = SalvarCurvasDeK(
        [10, 20, 30], [450.0, 420.0, 400.0], [0.03, 0.05, 0.06], tmp_path / "curvas.png"
    )
    assert _EhPng(caminho)
