-- NextRead: tabelas-base existentes no modelo EF Core (fora das migrations).
-- Execute no banco livros_pi. Nao remove registros existentes.
BEGIN;

CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    data_cadastro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT usuarios_email_key UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS livros (
    id_livro BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    titulo TEXT NOT NULL,
    isbn VARCHAR(30),
    descricao TEXT,
    ano_publicacao INTEGER,
    imagem_capa TEXT,
    autores TEXT,
    categoria TEXT,
    avaliacao_media NUMERIC(3,2),
    editora TEXT,
    preco_inicial NUMERIC(10,2),
    mes_publicacao VARCHAR(30)
);

CREATE TABLE IF NOT EXISTS livros_salvos (
    id_salvo BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario BIGINT NOT NULL,
    id_livro BIGINT NOT NULL,
    data_salvo TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_salvo_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_salvo_livro FOREIGN KEY (id_livro) REFERENCES livros(id_livro) ON DELETE CASCADE,
    CONSTRAINT uq_usuario_livro_salvo UNIQUE (id_usuario, id_livro)
);

CREATE TABLE IF NOT EXISTS interacoes (
    id_interacao BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario BIGINT NOT NULL,
    id_livro BIGINT NOT NULL,
    tipo_interacao VARCHAR(50) NOT NULL,
    data_interacao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_interacao_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_interacao_livro FOREIGN KEY (id_livro) REFERENCES livros(id_livro) ON DELETE CASCADE,
    CONSTRAINT chk_tipo_interacao CHECK (tipo_interacao IN ('visualizacao', 'salvou', 'removeu_salvo'))
);
COMMIT;
