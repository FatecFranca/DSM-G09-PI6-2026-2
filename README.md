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
| `src/` | back-end | API em C# / ASP.NET Core com EF Core |
| `ml/` | back-end | Pipeline Python: ingestão do dataset e modelo de recomendação |
| `web/` | front-end | Protótipo web, telas estáticas e navegação da aplicação |

O back-end é poliglota de propósito: a API é C# (tipagem em tempo de compilação e
migrations do EF Core) e a mineração de dados é Python (pandas e scikit-learn).
Os dois lados não conversam por HTTP — o Python grava o resultado do modelo na tabela
`livros_similares` e a API lê de lá.

O `BooksDataset.csv` fica na raiz, fora do versionamento (descompacte o `.zip` antes de
rodar a ingestão).

## Sprint 1 — entregue

- estrutura da API em ASP.NET Core, com Swagger e os endpoints do front
- CRUD de usuário, com senha guardada em hash (PBKDF2)
- mapeamento EF Core do schema do banco, mais a tabela `livros_similares`
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

## Arquitetura em Nuvem (Planejamento)

Para atender à arquitetura da aplicação e respeitar os Requisitos Não Funcionais (como performance e sistema modular), a infraestrutura foi desenhada de forma distribuída e assíncrona, utilizando o ecossistema **Google Cloud Platform (GCP)**:

- **Front-end:** Google Cloud Storage (Static Website Hosting) ou Firebase Hosting para servir os arquivos estáticos (HTML/CSS/JS) com alta disponibilidade e baixo custo.
- **Back-end (API C#):** Google Compute Engine (GCE) com instância `e2-micro` para hospedar a API ASP.NET Core, mantendo o controle do ambiente Linux e das dependências.
- **Banco de Dados:** Google Cloud SQL (PostgreSQL) para garantir a integridade relacional das tabelas de usuários, livros e interações, automatizando rotinas de backup e segurança.
- **Mineração de Dados e Mensageria (IA):** Arquitetura orientada a eventos usando **Google Cloud Pub/Sub**. As interações dos usuários (ex: salvar um livro) disparam eventos no tópico `aula-pub`. Em segundo plano, o script de Machine Learning atua como *Subscriber*, consumindo as mensagens de forma assíncrona para recalcular recomendações sem bloquear o tempo de resposta da API principal.

Instruções de execução:

- API C#: [`src/README.md`](src/README.md)
- Pipeline de ML: [`ml/README.md`](ml/README.md)
