from sqlalchemy import text
from sqlalchemy.orm import Session

# a coluna categoria guarda varios rotulos separados por virgula;
# o unnest quebra em categorias atomicas para o filtro do front
_ConsultaDeCategorias = text(
    """
    SELECT btrim(rotulo) AS categoria, COUNT(*) AS total_livros
    FROM livros, LATERAL unnest(string_to_array(categoria, ',')) AS rotulo
    WHERE categoria IS NOT NULL AND btrim(rotulo) <> ''
    GROUP BY btrim(rotulo)
    HAVING COUNT(*) >= :minimoDeLivros
    ORDER BY total_livros DESC, categoria
    LIMIT :limite
    """
)


def GetCategorias(
    sessao: Session, minimoDeLivros: int = 1, limite: int = 500
) -> list[tuple[str, int]]:
    resultado = sessao.execute(
        _ConsultaDeCategorias, {"minimoDeLivros": minimoDeLivros, "limite": limite}
    )
    return [(categoria, int(total)) for categoria, total in resultado]
