# DSM-G09-PI6-2026-2

Repositório do GRUPO 09 do Projeto Interdisciplinar do 6º semestre DSM 2026/2.
Alunos: Hudson Ribeiro, Maria Clara, Gustavo Schizzari e Eduardo Gibertoni

## O projeto

Sistema de recomendação de livros baseado em conteúdo. O dataset não traz avaliação de
usuário, então a recomendação vem dos metadados do próprio livro — título, categoria,
autores e descrição — via TF-IDF e similaridade de cosseno.

## Organização

| Pasta | Responsável | O que tem |
|---|---|---|
| `api/` | back-end | API FastAPI, ingestão do dataset e modelo de recomendação |

O `BooksDataset.csv` fica na raiz, fora do versionamento (descompacte o `.zip` antes de
rodar a ingestão).

## Sprint 1 — entregue

- estrutura da API em FastAPI, com Swagger e os quatro endpoints do front
- mapeamento SQLAlchemy do schema do banco, mais a tabela `livros_similares`
- ingestão do `BooksDataset.csv`: limpeza, normalização e carga via `COPY`
- pipeline de ML: TF-IDF sobre o conteúdo do livro, cosseno em blocos e persistência
  do top-N para o endpoint não recalcular a cada requisição

Instruções de execução em [`api/README.md`](api/README.md).
