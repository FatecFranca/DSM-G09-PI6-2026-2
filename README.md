# DSM-G09-PI6-2026-2

Repositório do GRUPO 09 do Projeto Interdisciplinar do 6º semestre DSM 2026/2.

**Alunos:** Hudson Ribeiro, Maria Clara, Gustavo Schizzari e Eduardo Gibertoni

## O projeto

Sistema de recomendação de livros baseado em conteúdo. O dataset não traz avaliação de
usuário, então a recomendação vem dos metadados do próprio livro — título, categoria,
autores e descrição — via TF-IDF e similaridade de cosseno.

A aplicação também conta com uma interface web para exploração do catálogo, visualização
dos detalhes dos livros, gerenciamento de livros salvos e apresentação de recomendações
por similaridade de conteúdo.

## Organização

| Pasta | Responsável | O que tem |
|---|---|---|
| `src/` | back-end | API em C# / ASP.NET Core com EF Core |
| `ml/` | back-end | Pipeline Python: ingestão do dataset e modelo de recomendação |
| `web/` | front-end | Interface HTML/CSS/JS integrada à API nas páginas de pesquisa, detalhes, recomendações, salvos e autenticação |

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

Na Sprint 1, as telas eram estáticas e tinham como objetivo definir a estrutura,
identidade visual e experiência de navegação da aplicação. Na Sprint 2, `pesquisa.html`
e `livro.html` passaram a consultar a API; as páginas `recomendacoes.html` e `salvos.html` foram conectadas posteriormente, e `login.html` implementa cadastro e entrada por sessão.

Principais telas:

- `index.html` — página inicial com livros do catálogo real
- `pesquisa.html` — exploração e pesquisa de livros
- `livro.html` — detalhes de um livro
- `salvos.html` — biblioteca de livros salvos
- `recomendacoes.html` — recomendações a partir dos livros salvos (ou de um livro selecionado)
- `login.html` — login e cadastro de usuários

## Arquitetura em Nuvem (Planejamento)

Para atender à arquitetura da aplicação e respeitar os Requisitos Não Funcionais (como performance e sistema modular), a infraestrutura foi desenhada de forma distribuída e assíncrona, utilizando o ecossistema **Google Cloud Platform (GCP)**:

- **Front-end:** Google Cloud Storage (Static Website Hosting) ou Firebase Hosting para servir os arquivos estáticos (HTML/CSS/JS) com alta disponibilidade e baixo custo.
- **Back-end (API C#):** Google Compute Engine (GCE) com instância `e2-micro` para hospedar a API ASP.NET Core, mantendo o controle do ambiente Linux e das dependências.
- **Banco de Dados:** Google Cloud SQL (PostgreSQL) para garantir a integridade relacional das tabelas de usuários, livros e interações, automatizando rotinas de backup e segurança.
- **Mineração de Dados e Mensageria (IA):** Arquitetura orientada a eventos usando **Google Cloud Pub/Sub**. As interações dos usuários (ex: salvar um livro) disparam eventos no tópico `aula-pub`. Em segundo plano, o script de Machine Learning atua como *Subscriber*, consumindo as mensagens de forma assíncrona para recalcular recomendações sem bloquear o tempo de resposta da API principal.

Instruções de execução:

- API C#: [`src/README.md`](src/README.md)
- Pipeline de ML: [`ml/README.md`](ml/README.md)


## Sprint 2 — Preparação do banco de dados

Scripts e instruções para criar as tabelas-base, carregar livros fictícios de demonstração e verificar a conexão estão em [`database/README.md`](database/README.md). A tabela de similares continua gerenciada pela migration existente do EF Core.


## Sprint 2 — Computação em Nuvem II (Etapa 3)

Foram adicionados `cloud/Dockerfile`, `cloud/cloudbuild.yaml`, `cloud/deploy.sh` e o guia [`cloud/README.md`](cloud/README.md) para uma implantação inicial com Cloud Run, Cloud SQL e Secret Manager. **Configuração pronta no repositório; implantação real e evidências no GCP pendentes.** Esta implementação adota Cloud Run no lugar do Compute Engine descrito na seção histórica de planejamento acima.


## Sprint 2 — Documentação intermediária (Etapa 4)

O relatório por requisito, o roteiro de validação, os comandos para reproduzir os testes e a checklist de capturas estão em [`docs/sprint2/README.md`](docs/sprint2/README.md). **Não há evidência de deploy real, testes ponta a ponta ou commits individuais embutida nesse material; devem ser registrados pela equipe.**


## Sprint 2 — Etapa 9: login e autorização

O sistema agora possui cadastro e login com hash PBKDF2 por meio do `PasswordHasher<Usuario>` existente,
**cookie HttpOnly**, autenticação por sessão, logout, controle de acesso à biblioteca e autorização
para editar/apagar apenas a própria conta. A página `web/login.html` foi implementada, e
`salvos.html` não usa mais IDs digitados manualmente.

Os endpoints disponíveis são `POST /auth/cadastro`, `POST /auth/entrar`,
`GET /auth/me` e `POST /auth/sair`.

**Para executar:** leia [`docs/sprint2/ETAPA9_AUTENTICACAO.md`](docs/sprint2/ETAPA9_AUTENTICACAO.md).
O script `tests/smoke/verificar_api.py` foi atualizado para testar sessão,
separação entre usuários e logout. **Não foi possível executar um build .NET ou uma
integração PostgreSQL neste ambiente**, portanto a validação final local permanece necessária.

As sessões por cookie são adequadas para o teste local com ambas as aplicações em
`localhost`. Para implantação pública, é necessário configurar HTTPS, origens CORS, proxy da
interface e persistência das chaves de proteção de dados entre instâncias.


## Sprint 2 — Correção do catálogo e recomendações

A página inicial agora carrega livros reais via `GET /livros`. A página de recomendações
consulta os livros salvos da sessão autenticada, reúne livros semelhantes sem repetir
livros já salvos e apresenta a origem das sugestões. Também continua possível acessar
`recomendacoes.html?id=ID` para comparar um livro específico com títulos semelhantes.

Quando a tabela `livros_similares` ainda não existe ou não foi preenchida, a API usa
outros livros da mesma categoria; não há pontuação TF-IDF nesse modo. O treino
continua sendo executado separadamente (veja `ml/README.md`).

Guia de validação e testes: [`docs/sprint2/CORRECAO_CATALOGO_RECOMENDACOES.md`](docs/sprint2/CORRECAO_CATALOGO_RECOMENDACOES.md).

### Link do Site: [NextRead](https://nextread-frontend.onrender.com/index.html)
