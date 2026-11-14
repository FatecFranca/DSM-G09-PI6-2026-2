"""grava as interacoes no postgres. o schema pertence a api (database/*.sql)."""

from collections.abc import Callable

import psycopg

from Consumidor.InteracoesService import BancoIndisponivel, EventoInteracao, ReferenciaInexistente

# on conflict: a mesma mensagem reentregue pelo service bus nao vira outra linha
InserirInteracao = """
    INSERT INTO interacoes (id_usuario, id_livro, tipo_interacao, data_interacao, id_evento)
    VALUES (%s, %s, %s, %s, %s)
    ON CONFLICT (id_evento) DO NOTHING
"""


def GravarInteracao(conexao: psycopg.Connection, evento: EventoInteracao) -> bool:
    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                InserirInteracao,
                (evento.IdUsuario, evento.IdLivro, evento.Tipo, evento.Data, evento.IdEvento),
            )
            inserida = cursor.rowcount == 1
        conexao.commit()
        return inserida
    except psycopg.errors.ForeignKeyViolation as erro:
        conexao.rollback()
        raise ReferenciaInexistente(
            f"usuario {evento.IdUsuario} ou livro {evento.IdLivro} nao existe"
        ) from erro
    except psycopg.OperationalError as erro:
        raise BancoIndisponivel(str(erro)) from erro
    except Exception:
        if not conexao.closed:
            conexao.rollback()
        raise


def CriarGravador(bancoUrl: str) -> Callable[[EventoInteracao], bool]:
    """mantem uma conexao aberta entre mensagens e reconecta se o banco cair."""
    estado: dict[str, psycopg.Connection | None] = {"conexao": None}

    def Gravar(evento: EventoInteracao) -> bool:
        conexao = estado["conexao"]
        if conexao is None or conexao.closed:
            try:
                # sem limite, um host sem resposta segura a mensagem ~20 s e o lock pode expirar
                conexao = estado["conexao"] = psycopg.connect(bancoUrl, connect_timeout=5)
            except (psycopg.OperationalError, psycopg.ProgrammingError) as erro:
                raise BancoIndisponivel(str(erro)) from erro
        try:
            return GravarInteracao(conexao, evento)
        except BancoIndisponivel:
            conexao.close()
            estado["conexao"] = None
            raise

    return Gravar
