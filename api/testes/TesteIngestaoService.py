from decimal import Decimal

import pandas as pd

from app.Services.IngestaoService import (
    ExtrairMesEAno,
    ExtrairPreco,
    GerarChaveDeDuplicidade,
    LimparAutores,
    LimparCategoria,
    LimparTexto,
    TransformarLote,
)


def TestePrecoNoFormatoDoDataset():
    assert ExtrairPreco("Price Starting at $8.79") == Decimal("8.79")
    assert ExtrairPreco("Price Starting at $1,234.56") == Decimal("1234.56")


def TestePrecoInvalidoViraNulo():
    assert ExtrairPreco("Price Starting at $0.00") is None
    assert ExtrairPreco("") is None
    assert ExtrairPreco(None) is None


def TesteDataPorExtenso():
    assert ExtrairMesEAno("Friday, January 1, 1993") == ("Janeiro", 1993)
    assert ExtrairMesEAno("Sunday, March 1, 1981") == ("Março", 1981)


def TesteDataEmColunasSeparadas():
    assert ExtrairMesEAno(None, "September", "1983") == ("Setembro", 1983)


def TesteDataSemMes():
    assert ExtrairMesEAno("1997") == (None, 1997)
    assert ExtrairMesEAno(None) == (None, None)


def TesteAnoForaDoIntervaloEIgnorado():
    assert ExtrairMesEAno("Friday, January 1, 1093")[1] is None


def TesteAutorPerdePrefixoESufixo():
    assert LimparAutores("By Colton, Larry") == "Colton, Larry"
    assert (
        LimparAutores("By Canfield, Jack (COM) and Hansen, Mark Victor (COM)")
        == "Canfield, Jack and Hansen, Mark Victor"
    )


def TesteCategoriaNormalizaEspacosEDuplicatas():
    assert LimparCategoria(" History , General") == "History, General"
    assert LimparCategoria(" General , General ") == "General"
    assert LimparCategoria("") is None


def TesteTextoVazioViraNulo():
    assert LimparTexto("   ") is None
    assert LimparTexto(" , ") is None


def TesteTransformarLoteIgnoraLinhaSemTitulo():
    lote = pd.DataFrame(
        [
            {
                "Title": "Goat Brothers",
                "Authors": "By Colton, Larry",
                "Description": "",
                "Category": " History , General",
                "Publisher": "Doubleday",
                "Publish Date": "Friday, January 1, 1993",
                "Price": "Price Starting at $8.79",
            },
            {
                "Title": "",
                "Authors": "By Ninguem",
                "Description": "",
                "Category": "",
                "Publisher": "",
                "Publish Date": "",
                "Price": "",
            },
        ]
    )
    from app.Services.IngestaoService import _RenomearColunas

    registros = TransformarLote(_RenomearColunas(lote))

    assert len(registros) == 1
    titulo, descricao, ano, autores, categoria, editora, preco, mes = registros[0]
    assert titulo == "Goat Brothers"
    assert descricao is None
    assert (ano, mes) == (1993, "Janeiro")
    assert autores == "Colton, Larry"
    assert categoria == "History, General"
    assert editora == "Doubleday"
    assert preco == Decimal("8.79")


def TesteChaveDeDuplicidadeIgnoraCaixa():
    a = ("O Hobbit", None, 1937, "Tolkien", None, None, None, None)
    b = ("o hobbit", "outra descricao", 1954, "TOLKIEN", "Fiction", None, None, None)
    assert GerarChaveDeDuplicidade(a) == GerarChaveDeDuplicidade(b)
