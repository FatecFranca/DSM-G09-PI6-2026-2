-- Use este resultado como evidencia da Sprint 2.
SELECT 'usuarios' AS tabela, count(*) AS total FROM usuarios
UNION ALL SELECT 'livros', count(*) FROM livros
UNION ALL SELECT 'livros_salvos', count(*) FROM livros_salvos
UNION ALL SELECT 'interacoes', count(*) FROM interacoes
UNION ALL SELECT 'livros_similares', count(*) FROM livros_similares;

SELECT id_livro, titulo, autores, categoria FROM livros ORDER BY id_livro LIMIT 15;

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('usuarios','livros','livros_salvos','interacoes','livros_similares')
ORDER BY table_name;
