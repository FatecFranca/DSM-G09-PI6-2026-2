import re
import unicodedata
from collections.abc import Iterator
from decimal import Decimal, InvalidOperation
from pathlib import Path

import pandas as pd

from Mineracao.BancoDados import AbrirConexao

# o dataset circula em dois formatos; os dois caem no mesmo nome canonico
MapaDeColunas = {
    "title": "Titulo",
    "authors": "Autores",
    "description": "Descricao",
    "category": "Categoria",
    "categories": "Categoria",
    "publisher": "Editora",
    "price": "Preco",
    "price starting with ($)": "Preco",
    "publish date": "DataPublicacao",
    "publish date (month)": "MesPublicacao",
    "publish date (year)": "AnoPublicacao",
}

MesesEmPortugues = {
    "january": "Janeiro",
    "february": "Fevereiro",
    "march": "Março",
    "april": "Abril",
    "may": "Maio",
    "june": "Junho",
    "july": "Julho",
    "august": "Agosto",
    "september": "Setembro",
    "october": "Outubro",
    "november": "Novembro",
    "december": "Dezembro",
}

ColunasDeCarga = (
    "titulo",
    "descricao",
    "ano_publicacao",
    "autores",
    "categoria",
    "editora",
    "preco_inicial",
    "mes_publicacao",
)

_PadraoPreco = re.compile(r"(\d[\d.,]*)")
_PadraoAno = re.compile(r"(1[5-9]\d{2}|20\d{2})")
_PadraoPrefixoAutor = re.compile(r"^\s*by\s+", re.IGNORECASE)
_PadraoSufixoAutor = re.compile(r"\s*\((?:COM|EDT|ILT|TRN|PHT|CON|FRW|INT|NRT|RTL)\)", re.IGNORECASE)
_PadraoEspacos = re.compile(r"\s+")


def LimparTexto(valor) -> str | None:
    if valor is None or (isinstance(valor, float) and pd.isna(valor)):
        return None
    texto = _PadraoEspacos.sub(" ", str(valor)).strip()
    texto = texto.strip(" ,;-")
    return texto or None


def LimparAutores(valor) -> str | None:
    texto = LimparTexto(valor)
    if texto is None:
        return None
    texto = _PadraoPrefixoAutor.sub("", texto)
    texto = _PadraoSufixoAutor.sub("", texto)
    return LimparTexto(texto)


def LimparCategoria(valor) -> str | None:
    texto = LimparTexto(valor)
    if texto is None:
        return None
    partes = []
    for parte in texto.split(","):
        parte = LimparTexto(parte)
        if parte and parte not in partes:
            partes.append(parte)
    return ", ".join(partes) or None


def ExtrairPreco(valor) -> Decimal | None:
    texto = LimparTexto(valor)
    if texto is None:
        return None
    encontrado = _PadraoPreco.search(texto.replace(",", ""))
    if not encontrado:
        return None
    try:
        preco = Decimal(encontrado.group(1))
    except InvalidOperation:
        return None
    if preco <= 0 or preco >= Decimal("100000000"):
        return None
    return preco.quantize(Decimal("0.01"))


def ExtrairMesEAno(dataPublicacao, mesBruto=None, anoBruto=None) -> tuple[str | None, int | None]:
    mes = LimparTexto(mesBruto)
    ano = None

    texto = LimparTexto(dataPublicacao)
    if texto:
        if mes is None:
            for nomeIngles in MesesEmPortugues:
                if nomeIngles in texto.lower():
                    mes = nomeIngles
                    break
        encontrado = _PadraoAno.search(texto)
        if encontrado:
            ano = int(encontrado.group(1))

    if ano is None:
        textoAno = LimparTexto(anoBruto)
        if textoAno:
            encontrado = _PadraoAno.search(textoAno)
            if encontrado:
                ano = int(encontrado.group(1))

    if mes:
        mes = MesesEmPortugues.get(mes.lower(), mes.capitalize())

    return mes, ano


def _NormalizarNomeDeColuna(nome: str) -> str:
    nome = unicodedata.normalize("NFKD", str(nome)).encode("ascii", "ignore").decode()
    return _PadraoEspacos.sub(" ", nome).strip().lower()


def _RenomearColunas(lote: pd.DataFrame) -> pd.DataFrame:
    renomeadas = {}
    for coluna in lote.columns:
        canonica = MapaDeColunas.get(_NormalizarNomeDeColuna(coluna))
        if canonica:
            renomeadas[coluna] = canonica
    return lote.rename(columns=renomeadas)


def LerDataset(caminho: Path, tamanhoLote: int = 20_000) -> Iterator[pd.DataFrame]:
    leitor = pd.read_csv(
        caminho,
        chunksize=tamanhoLote,
        dtype=str,
        keep_default_na=False,
        na_values=[""],
        on_bad_lines="skip",
        encoding="utf-8",
    )
    for lote in leitor:
        yield _RenomearColunas(lote)


def TransformarLote(lote: pd.DataFrame) -> list[tuple]:
    registros = []
    for linha in lote.to_dict(orient="records"):
        titulo = LimparTexto(linha.get("Titulo"))
        if not titulo:
            continue

        mes, ano = ExtrairMesEAno(
            linha.get("DataPublicacao"),
            linha.get("MesPublicacao"),
            linha.get("AnoPublicacao"),
        )

        registros.append(
            (
                titulo,
                LimparTexto(linha.get("Descricao")),
                ano,
                LimparAutores(linha.get("Autores")),
                LimparCategoria(linha.get("Categoria")),
                LimparTexto(linha.get("Editora")),
                ExtrairPreco(linha.get("Preco")),
                mes,
            )
        )
    return registros


def GerarChaveDeDuplicidade(registro: tuple) -> tuple:
    titulo = (registro[0] or "").casefold()
    autores = (registro[3] or "").casefold()
    return titulo, autores


def CarregarDataset(
    caminho: Path,
    tamanhoLote: int = 20_000,
    limparAntes: bool = False,
    removerDuplicados: bool = True,
) -> dict:
    if not caminho.exists():
        raise FileNotFoundError(f"dataset nao encontrado em {caminho}")

    vistos: set[tuple] = set()
    totalLido = 0
    totalGravado = 0
    totalIgnorado = 0

    comando = f"COPY livros ({', '.join(ColunasDeCarga)}) FROM STDIN"

    # o with do psycopg faz commit no sucesso e rollback se estourar
    with AbrirConexao() as conexao:
        with conexao.cursor() as cursor:
            if limparAntes:
                cursor.execute("TRUNCATE livros RESTART IDENTITY CASCADE")

            with cursor.copy(comando) as copia:
                for lote in LerDataset(caminho, tamanhoLote):
                    totalLido += len(lote)
                    for registro in TransformarLote(lote):
                        if removerDuplicados:
                            chave = GerarChaveDeDuplicidade(registro)
                            if chave in vistos:
                                totalIgnorado += 1
                                continue
                            vistos.add(chave)
                        copia.write_row(registro)
                        totalGravado += 1

        conexao.commit()

    return {
        "linhas_lidas": totalLido,
        "livros_gravados": totalGravado,
        "duplicados_ignorados": totalIgnorado,
    }
