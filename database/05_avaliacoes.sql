-- notas de 1 a 5 estrelas que cada usuario da aos livros; base do "para voce".
-- pode rodar mais de uma vez. rode tambem no banco de producao.
BEGIN;

CREATE TABLE IF NOT EXISTS avaliacoes (
    id_avaliacao BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario BIGINT NOT NULL,
    id_livro BIGINT NOT NULL,
    nota SMALLINT NOT NULL,
    avaliado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_avaliacao_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_avaliacao_livro FOREIGN KEY (id_livro) REFERENCES livros(id_livro) ON DELETE CASCADE,
    CONSTRAINT chk_avaliacao_nota CHECK (nota BETWEEN 1 AND 5),
    CONSTRAINT uq_usuario_livro_avaliacao UNIQUE (id_usuario, id_livro)
);

COMMIT;
