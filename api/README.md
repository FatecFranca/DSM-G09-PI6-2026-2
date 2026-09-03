# API de Recomendação de Livros

Back-end do PI6 — grupo 09. FastAPI + PostgreSQL + scikit-learn.
A recomendação é **baseada em conteúdo**: o dataset não tem nota de usuário, então a
similaridade sai dos metadados do próprio livro (título, categoria, autores, descrição).

## Stack

| Camada | O que é usado |
|---|---|
| API | FastAPI 0.141 (Swagger em `/docs`) |
| ORM | SQLAlchemy 2.0 + psycopg 3 |
| Banco | PostgreSQL 18 (schema do time de modelagem) |
| ML | scikit-learn `TfidfVectorizer` + similaridade de cosseno |
| Dados | pandas (leitura do CSV em lotes) |
| Runtime | Python 3.14 |

## Estrutura

```
api/
├── app/
│   ├── Main.py                          instância FastAPI, CORS, ciclo de vida
│   ├── Core/
│   │   ├── Configuracao.py              variáveis de ambiente (.env)
│   │   ├── BancoDados.py                engine, sessão, Base declarativa
│   │   └── Dependencias.py              injeções compartilhadas dos controllers
│   ├── Models/                          mapeamento SQLAlchemy do schema
│   │   ├── UsuarioModel.py
│   │   ├── LivroModel.py
│   │   ├── LivroSalvoModel.py
│   │   ├── InteracaoModel.py
│   │   └── LivroSimilarModel.py         tabela nova, criada pela API
│   ├── Schemas/                         contratos Pydantic (JSON em snake_case)
│   ├── Services/
│   │   ├── LivrosService.py             consulta e paginação
│   │   ├── CategoriasService.py         categorias atômicas via unnest
│   │   ├── IngestaoService.py           limpeza do CSV + carga por COPY
│   │   └── RecomendacaoService.py       TF-IDF, cosseno, persistência do top-N
│   ├── Controllers/
│   │   ├── LivrosController.py
│   │   ├── CategoriasController.py
│   │   └── RecomendacoesController.py
│   └── Scripts/
│       ├── CriarSchema.py
│       ├── CarregarDataset.py
│       └── TreinarRecomendador.py
├── testes/                              pytest, roda sem banco
└── artefatos/                           modelo treinado (fora do git)
```

Convenção de nomes: classes, métodos e arquivos em **PascalCase e português**
(`GetLivros`, `LivrosController`), termos técnicos mantidos em inglês
(`Controller`, `Service`, `Schema`, `Model`). O JSON da API sai em **snake_case**,
igual às colunas do banco — a conversão é automática, feita em `Schemas/BaseSchema.py`.

## Modelo de dados

Tabelas do time de modelagem, mapeadas sem alteração:

- `usuarios` — `id_usuario`, `nome`, `email` (único), `senha_hash`, `data_cadastro`
- `livros` — `id_livro`, `titulo`, `isbn`, `descricao`, `ano_publicacao`, `imagem_capa`,
  `autores`, `categoria`, `avaliacao_media`, `editora`, `preco_inicial`, `mes_publicacao`
- `livros_salvos` — FK para usuário e livro, `UNIQUE (id_usuario, id_livro)`
- `interacoes` — `tipo_interacao` restrito a `visualizacao` / `salvou` / `removeu_salvo`

Tabela acrescentada pela API:

- `livros_similares` — `(id_livro, posicao)` como chave, `id_livro_similar` e `score`.
  Guarda o top-N já calculado para o endpoint não recalcular a cada requisição.

`CriarSchema.py` roda com `checkfirst`: não recria nem altera o que já existe no banco.

## Como rodar

```bash
cd api
python -m venv .venv
.venv\Scripts\activate            # linux/mac: source .venv/bin/activate
pip install -r requirements-dev.txt
copy .env.example .env            # linux/mac: cp .env.example .env
```

Ajuste `BANCO_URL` no `.env` para o Postgres do projeto.

### 1. Schema

```bash
python -m app.Scripts.CriarSchema
```

Use `--imprimir` para ver o DDL sem tocar no banco.

### 2. Ingestão do dataset

O `BooksDataset.csv` fica na raiz do repositório (fora do git — descompacte o `.zip`).

```bash
python -m app.Scripts.CarregarDataset
```

Se a tabela `livros` já tiver dados, o script avisa e não faz nada. Para recarregar do zero:

```bash
python -m app.Scripts.CarregarDataset --limpar
```

O que a ingestão faz com cada linha:

| Coluna do CSV | Tratamento |
|---|---|
| `Title` | normaliza espaços; linha sem título é descartada |
| `Authors` | tira o prefixo `By ` e sufixos de função (`(COM)`, `(EDT)`, …) |
| `Description` | normaliza espaços; vazio vira `NULL` |
| `Category` | `" History , General"` → `"History, General"`, sem repetição |
| `Publisher` | normaliza espaços |
| `Price` | `"Price Starting at $8.79"` → `8.79`; zero e lixo viram `NULL` |
| `Publish Date` | `"Friday, January 1, 1993"` → mês `Janeiro` + ano `1993` |

Títulos repetidos do mesmo autor são descartados (`--manter-duplicados` desliga isso).
A carga é feita por `COPY`, não por `INSERT` linha a linha.

O script também aceita o formato alternativo do dataset, com
`Price Starting With ($)`, `Publish Date (Month)` e `Publish Date (Year)` separados.

### 3. Treino do recomendador

```bash
python -m app.Scripts.TreinarRecomendador --persistir
```

Pipeline:

1. monta o corpus por livro — `título ×2 + categoria ×3 + autores ×2 + descrição`,
   para o gênero e a autoria pesarem mais que o texto corrido;
2. vetoriza com `TfidfVectorizer` (`stop_words="english"`, `min_df=3`, `max_df=0.5`,
   `sublinear_tf`, `norm="l2"`, até 120 mil termos);
3. salva o artefato em `artefatos/modelo-tfidf.joblib` (~27 MB), carregado no start da API;
4. com `--persistir`, calcula o cosseno em blocos e grava o top-N em `livros_similares`.

Como a matriz sai normalizada em L2, o cosseno é só o produto interno — não existe
matriz 103k × 103k em memória, o cálculo é feito por blocos de 256 livros.

Referência com o dataset completo (103.082 livros): vocabulário de ~55 mil termos,
matriz esparsa de 37 MB, treino em ~9 s, consulta individual em ~20 ms.

### 4. Subir a API

```bash
uvicorn app.Main:Aplicacao --reload
```

Swagger em <http://localhost:8000/docs>.

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| GET | `/livros` | lista paginada; `pagina`, `tamanhoPagina`, `categoria`, `busca` |
| GET | `/livros/{idLivro}` | detalhe do livro |
| GET | `/livros/{idLivro}/recomendacoes` | similares; `total` (1–50) |
| GET | `/categorias` | categorias atômicas com contagem; `minimoDeLivros`, `limite` |
| GET | `/saude` | estado do banco e do modelo carregado |

O campo `origem` na resposta de recomendações diz de onde veio o resultado:

- `tabela` — top-N pré-calculado em `livros_similares` (caminho normal);
- `modelo` — calculado na hora pelo TF-IDF em memória (se a tabela estiver vazia);
- `categoria` — plano B por categoria, quando não há modelo treinado.

## Testes

```bash
pytest
```

19 testes, todos sem dependência de banco: cobrem a limpeza do dataset e a matemática
da recomendação (ordenação por score, o próprio livro fora do resultado, e o cálculo
em bloco batendo com o individual).
