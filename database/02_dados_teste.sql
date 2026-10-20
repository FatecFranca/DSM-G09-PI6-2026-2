-- Amostra demonstrativa e ficticia; nao substitui BooksDataset.csv.
-- Seguro para reexecutar: cada livro so e inserido se titulo e autor nao existirem.
BEGIN;
WITH dados (titulo, autores, categoria, descricao, ano_publicacao, editora, mes_publicacao, preco_inicial) AS (
    VALUES
    ('O Jardim das Estrelas', 'Marina Oliveira', 'Fantasia', 'Uma viagem por cidades suspensas e antigas constelacoes.', 2021, 'Editora Horizonte', 'Março', 39.90::numeric),
    ('Circuitos do Amanhã', 'Paulo Martins', 'Ficção científica', 'Inteligencia artificial e exploracao de novos planetas.', 2023, 'Editora Aurora', 'Julho', 49.90::numeric),
    ('Mistério na Biblioteca', 'Ana Costa', 'Mistério', 'Uma investigadora descobre pistas entre livros raros.', 2020, 'Editora Estação', 'Janeiro', 34.50::numeric),
    ('As Cidades Invisíveis', 'Luiza Ferreira', 'Fantasia', 'Um mapa revela reinos escondidos.', 2022, 'Editora Horizonte', 'Abril', 42.00::numeric),
    ('Programação para Iniciantes', 'Rafael Nunes', 'Tecnologia', 'Conceitos fundamentais de algoritmos e programação.', 2024, 'Editora Saber', 'Fevereiro', 55.00::numeric),
    ('A Última Órbita', 'Bianca Alves', 'Ficção científica', 'Uma tripulacao precisa salvar sua estacao espacial.', 2022, 'Editora Aurora', 'Junho', 47.90::numeric),
    ('Receitas de Família', 'Camila Ribeiro', 'Culinária', 'Receitas e historias compartilhadas em familia.', 2019, 'Editora Sabor', 'Maio', 29.90::numeric),
    ('Os Segredos do Farol', 'Thiago Pereira', 'Mistério', 'Eventos estranhos acontecem em um farol isolado.', 2021, 'Editora Estação', 'Agosto', 38.00::numeric),
    ('Introdução à Astronomia', 'Daniel Souza', 'Ciência', 'Um guia introdutorio ao universo e as estrelas.', 2023, 'Editora Saber', 'Outubro', 59.90::numeric),
    ('Trilhas da Montanha', 'Julia Mendes', 'Aventura', 'Uma equipe parte em uma expedicao inesquecivel.', 2020, 'Editora Terra', 'Setembro', 32.90::numeric),
    ('O Castelo e a Lua', 'Renata Lima', 'Fantasia', 'Uma aprendiz descobre a origem de uma antiga magia.', 2024, 'Editora Horizonte', 'Novembro', 44.90::numeric),
    ('Robôs e Sociedade', 'Leonardo Castro', 'Tecnologia', 'Reflexoes sobre automacao e trabalho no futuro.', 2024, 'Editora Saber', 'Dezembro', 51.50::numeric)
)
INSERT INTO livros (titulo, autores, categoria, descricao, ano_publicacao, editora, mes_publicacao, preco_inicial)
SELECT d.titulo, d.autores, d.categoria, d.descricao, d.ano_publicacao, d.editora, d.mes_publicacao, d.preco_inicial
FROM dados d
WHERE NOT EXISTS (
    SELECT 1 FROM livros l WHERE l.titulo = d.titulo AND l.autores = d.autores
);
COMMIT;
