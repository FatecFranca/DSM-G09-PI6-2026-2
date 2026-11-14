# NextRead

Projeto Interdisciplinar do 6º semestre de DSM (Fatec Franca, 2026/2), grupo 09.

**Integrantes:** Hudson Ribeiro, Maria Clara, Gustavo Schizzari e Eduardo Gibertoni

**Site:** [nextread-frontend.onrender.com](https://nextread-frontend.onrender.com/)

## O projeto

O NextRead recomenda livros pelo conteúdo. O dataset (cerca de 99 mil livros) não traz avaliações
de usuários, então a recomendação vem dos metadados do próprio livro: título, categoria, autores e
descrição, comparados por TF-IDF e similaridade de cosseno.

- **Catálogo:** busca, filtro por categoria e página de cada livro.
- **Biblioteca:** cada pessoa salva os livros que quer ler (sessão por cookie).
- **Parecidos com este livro:** os 10 vizinhos mais próximos de cada livro, calculados pelo pipeline
  de mineração de dados.
- **Para você:** a pessoa dá notas de 1 a 5 estrelas e recebe uma lista individual, com o motivo de
  cada sugestão ("Porque você deu 5★ a …").
- **Mineração de dados:** classificação de gênero (supervisionado) e clusterização (não
  supervisionado), documentadas pelas fases do CRISP-DM.
- **Mensageria:** as interações (visualizar, salvar, remover) passam por uma fila do Azure Service
  Bus até um consumidor em Python.

## Arquitetura

```
                                      BooksDataset.csv
                                             │
                                             ▼
                               ml/ (limpeza, TF-IDF, cosseno)
                                             │ livros, livros_similares
                                             ▼
web/, mobile/ ──HTTP──► API C# (src/) ◄──► PostgreSQL
                              │                  ▲
                              │ eventos          │ interacoes
                              ▼                  │
                     Azure Service Bus ──► mensageria/ (Python)
```

O Python e a API não conversam por HTTP. O pipeline grava os vizinhos de cada livro na tabela
`livros_similares` e a API só lê dali. A API publica os eventos na fila, e o consumidor os grava em
`interacoes`.

## Organização

| Pasta | O que tem | Documentação |
|---|---|---|
| `src/` e `web/` | API em ASP.NET Core 10 e site em React + Vite + TypeScript | [`src/README.md`](src/README.md) |
| `ml/` | ingestão do dataset, recomendador e mineração de dados (CRISP-DM) | [`ml/README.md`](ml/README.md) |
| `mobile/` | aplicativo em Expo + React Native | [`mobile/README.md`](mobile/README.md) |
| `mensageria/` e `cloud/` | consumidor do Azure Service Bus e implantação em nuvem | [`mensageria/README.md`](mensageria/README.md) |
| `database/` | scripts SQL das tabelas | seção [Banco de dados](#2-banco-de-dados) abaixo |
| `tests/` | testes da API (xUnit) e smoke test HTTP | seção [Testes](#testes) abaixo |

## Como rodar localmente

### 1. Pré-requisitos

- .NET SDK 10 e a ferramenta `dotnet-ef` (`dotnet tool install --global dotnet-ef`)
- PostgreSQL 18
- Python 3.14
- Node 24
- `BooksDataset.csv` na raiz do repositório (fora do Git; descompacte o `.zip`)

As senhas ficam em arquivos locais que não vão para o Git:

| Arquivo | Para quê | Modelo |
|---|---|---|
| `src/Livros.Api/appsettings.Development.json` | conexão da API com o banco e a fila | `appsettings.Development.json.example` |
| `ml/.env` | `BANCO_URL=postgresql://...` para o Python | `ml/.env.example` |
| `mensageria/.env` | conexão com a fila e o banco | `mensageria/.env.example` |
| `web/.env` (opcional) | `VITE_API_URL` para usar outra API | `web/.env.example` |

### 2. Banco de dados

Crie o banco com `CREATE DATABASE livros_pi;` (fora de transação) e execute, conectado a ele
(pgAdmin ou `psql`):

1. `database/01_criar_tabelas.sql`: `usuarios`, `livros`, `livros_salvos` e `interacoes`.
2. A migration do EF Core, que cria `livros_similares`:
   ```bash
   dotnet ef database update --project src/Livros.Dados --startup-project src/Livros.Api
   ```
3. `database/04_mensageria.sql`: coluna `id_evento` em `interacoes` (evita gravar a mesma mensagem
   duas vezes).
4. `database/05_avaliacoes.sql`: tabela `avaliacoes` (notas de 1 a 5).
5. `database/03_verificar_banco.sql`: confere as tabelas e a contagem de livros.

Todos os scripts podem rodar mais de uma vez sem apagar dados. Os scripts `04` e `05` também precisam
rodar no banco de produção. `CREATE TABLE IF NOT EXISTS` não atualiza tabelas antigas: em um banco
antigo, compare as colunas com as entidades em `src/Livros.Dominio`.

Para uma demonstração rápida sem o dataset, `database/02_dados_teste.sql` insere 12 livros
fictícios. Não misture com o catálogo real nem rode em produção.

### 3. Catálogo e recomendações (Python)

```bash
cd ml
python -m venv .venv
.venv/Scripts/pip install -r requirements-dev.txt
.venv/Scripts/python -m Scripts.CarregarDataset                  # ~99 mil livros
.venv/Scripts/python -m Scripts.TreinarRecomendador --persistir  # ~3 min, preenche livros_similares
```

Sem o treino, a API recomenda por categoria. Detalhes e a mineração de dados em
[`ml/README.md`](ml/README.md).

### 4. API

```bash
dotnet run --project src/Livros.Api --launch-profile http
```

A API sobe em `http://localhost:5267`, com o Swagger em `/swagger` e a verificação de saúde em
`/saude`.

### 5. Site

```bash
cd web
npm ci
npm run dev
```

O site abre em `http://localhost:5500`. A porta é fixa porque o CORS de desenvolvimento da API só
libera a 5500.

### 6. Opcionais

- **Consumidor de mensagens:** veja [`mensageria/README.md`](mensageria/README.md). Sem a
  configuração da fila, a API funciona normalmente e só registra no log que não publicou.
- **Aplicativo mobile:** veja [`mobile/README.md`](mobile/README.md).

## Testes

| Parte | Comando | O que cobre |
|---|---|---|
| API | `dotnet test src/Livros.slnx` | serviços, controllers, "Para você", mensageria (xUnit, banco em memória) |
| Site | `cd web && npm test` (e `npm run typecheck`, `npm run lint`) | páginas, componentes e cliente da API (Vitest, sem API) |
| Mineração | `cd ml && .venv/Scripts/python -m pytest` | ingestão, recomendador, classificador e clusterização (sem banco) |
| Mensageria | `cd mensageria && .venv/Scripts/python -m pytest` | decisões do consumidor (sem Azure nem banco) |
| Mobile | `cd mobile && npm run typecheck && npm test` | regras e cliente do app |

O smoke test HTTP exige a API e o banco rodando. Use só em banco de desenvolvimento: ele cria e apaga
duas contas temporárias.

```bash
python tests/smoke/verificar_api.py --base-url http://localhost:5267
```

## Histórico das sprints

- **Sprint 1:** API em ASP.NET Core com Swagger e CRUD de usuário (senha em PBKDF2), mapeamento EF
  Core, ingestão do dataset por `COPY`, recomendador TF-IDF + cosseno com top-N gravado no banco e
  protótipo do site em HTML/CSS.
- **Sprint 2:** scripts SQL das tabelas-base, login por cookie `HttpOnly` com acesso só aos próprios
  dados, biblioteca e recomendações ligadas à API, recomendação por categoria quando o modelo não
  foi treinado, Dockerfile e planejamento da nuvem, smoke test HTTP e primeira versão do app mobile.
- **Sprint 3:** site reescrito em React + Vite + TypeScript com a identidade visual nova (os
  endereços `.html` antigos redirecionam), mensageria com Azure Service Bus, classificação e
  clusterização no pipeline de mineração e avaliações com a lista "Para você".
