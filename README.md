# DSM-G09-PI6-2026-2

Repositório do GRUPO 09 do Projeto Interdisciplinar do 6º semestre DSM 2026/2.

**Alunos:** Hudson Ribeiro, Maria Clara, Gustavo Schizzari e Eduardo Gibertoni

## O projeto

Sistema de recomendação de livros baseado em conteúdo. O dataset não traz avaliação de
usuário, então a recomendação vem dos metadados do próprio livro — título, categoria,
autores e descrição — via TF-IDF e similaridade de cosseno.

A aplicação também conta com uma interface web para exploração do catálogo, visualização
dos detalhes dos livros, gerenciamento de livros salvos e apresentação de recomendações
personalizadas.

## Organização

| Pasta | Responsável | O que tem |
|---|---|---|
| `api/` | back-end | API FastAPI, ingestão do dataset e modelo de recomendação |
| `web/` | front-end | Protótipo web, telas estáticas e navegação da aplicação |

O `BooksDataset.csv` fica na raiz, fora do versionamento (descompacte o `.zip` antes de
rodar a ingestão).

## Sprint 1 — entregue

- estrutura da API em FastAPI, com Swagger e os quatro endpoints do front
- mapeamento SQLAlchemy do schema do banco, mais a tabela `livros_similares`
- ingestão do `BooksDataset.csv`: limpeza, normalização e carga via `COPY`
- pipeline de ML: TF-IDF sobre o conteúdo do livro, cosseno em blocos e persistência
  do top-N para o endpoint não recalcular a cada requisição
- protótipo inicial do front-end desenvolvido em HTML e CSS
- identidade visual e layout responsivo inicial da aplicação
- navegação entre as principais telas do sistema
- tela inicial com apresentação da plataforma e campo de pesquisa
- tela de exploração e pesquisa do catálogo
- tela de detalhes do livro
- tela de livros salvos do usuário
- tela de recomendações personalizadas

### Front-end

O protótipo da interface está localizado na pasta `web/`.

Nesta primeira sprint, as telas são estáticas e têm como objetivo definir a estrutura,
identidade visual e experiência de navegação da aplicação. A integração com a API e
com os dados reais do sistema será realizada nas próximas etapas do projeto.

Principais telas:

- `index.html` — página inicial
- `pesquisa.html` — exploração e pesquisa de livros
- `livro.html` — detalhes de um livro
- `salvos.html` — biblioteca de livros salvos
- `recomendacoes.html` — recomendações para o usuário

Instruções de execução do back-end em [`api/README.md`](api/README.md).