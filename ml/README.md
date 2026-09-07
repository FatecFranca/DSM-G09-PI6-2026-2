# Pipeline de mineração de dados — Python

Ingestão do dataset e modelo de recomendação por conteúdo. **Não é um serviço** — são
dois scripts que rodam, gravam no Postgres e terminam. A API em [`../src`](../src) lê o
resultado; os dois lados não conversam por HTTP.

```
CSV → limpeza → TF-IDF → cosseno → livros_similares → API C#
└──────────── Python ────────────┘                    └── C# ──┘
```

## Stack

| Etapa | Ferramenta |
|---|---|
| Leitura e limpeza do CSV | pandas |
| Vetorização | scikit-learn `TfidfVectorizer` |
| Similaridade | numpy + scipy.sparse |
| Banco | psycopg 3 (sem ORM — o schema é do EF Core) |
| Runtime | Python 3.14 |

Não há SQLAlchemy aqui de propósito: o dono do schema é o EF Core, no lado C#. Duas
definições da mesma tabela divergiriam mais cedo ou mais tarde.

## Estrutura

```
ml/
├── Mineracao/
│   ├── Configuracao.py         .env
│   ├── BancoDados.py           conexão psycopg
│   ├── IngestaoService.py      limpeza do CSV + carga por COPY
│   └── RecomendacaoService.py  TF-IDF, cosseno, persistência do top-N
├── Scripts/
│   ├── CarregarDataset.py
│   └── TreinarRecomendador.py
├── testes/                     pytest, roda sem banco
└── artefatos/                  modelo treinado (fora do git)
```

## Como rodar

```bash
cd ml
python -m venv .venv
.venv\Scripts\activate            # linux/mac: source .venv/bin/activate
pip install -r requirements-dev.txt
copy .env.example .env            # linux/mac: cp .env.example .env
```

Ajuste `BANCO_URL` no `.env`. Repare que aqui o formato é **URL** (`postgresql://...`),
que é o que o psycopg entende — diferente do `Host=...;Database=...` do `appsettings.json`
da API. É o mesmo banco, escrito de dois jeitos.

O schema precisa existir antes: rode a migration do EF Core primeiro
(veja [`../src/README.md`](../src/README.md)).

### 1. Ingestão

O `BooksDataset.csv` fica na raiz do repositório, fora do git — descompacte o `.zip`.

```bash
python -m Scripts.CarregarDataset
```

Se a tabela `livros` já tiver dados, o script avisa e não faz nada. Para recarregar:

```bash
python -m Scripts.CarregarDataset --limpar
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

Também funciona com o formato alternativo do dataset, que traz
`Price Starting With ($)`, `Publish Date (Month)` e `Publish Date (Year)` separados.

### 2. Treino

```bash
python -m Scripts.TreinarRecomendador --persistir
```

1. monta o corpus — `título ×2 + categoria ×3 + autores ×2 + descrição`, para o gênero
   e a autoria pesarem mais que o texto corrido;
2. vetoriza com `TfidfVectorizer` (`stop_words="english"`, `min_df=3`, `max_df=0.5`,
   `sublinear_tf`, `norm="l2"`, até 120 mil termos);
3. salva o artefato em `artefatos/modelo-tfidf.joblib` (~27 MB);
4. com `--persistir`, calcula o cosseno em blocos e grava o top-N em `livros_similares`.

Como a matriz sai normalizada em L2, o cosseno é só o produto interno. Não existe matriz
103k × 103k em memória — o cálculo vai em blocos de 256 livros.

Números com o dataset completo (103.082 livros): vocabulário de 55.290 termos, matriz
esparsa de 37 MB, treino em ~10 s, consulta individual em ~30 ms.

Os hiperparâmetros são todos flags (`--min-df`, `--max-features`, `--ngram`), então dá
para comparar configurações sem editar código.

## Testes

```bash
pytest
```

19 testes, nenhum precisa de banco. Cobrem a limpeza do dataset e a matemática da
recomendação — ordenação por score, o próprio livro fora do resultado, e o cálculo em
bloco batendo com o individual.

## Limitações conhecidas

1. **31,9% dos livros não têm descrição** — para esses, a recomendação sai fraca.
2. **TF-IDF não entende sinônimo** — "car" e "automobile" são termos sem relação.
   Embeddings semânticos (`sentence-transformers` + `pgvector`) resolveriam.
3. **Recomendação igual para todo mundo** — é livro→livro, sem personalização.
   As tabelas `interacoes` e `livros_salvos` ainda não entram no modelo.
4. **Peso de autor domina** — nos exemplos reais, o nome do autor puxa mais o score que
   o tema. O botão é `PesoDosAutores` em `RecomendacaoService.py`.
5. **Só funciona em inglês** — `stop_words="english"` e o vocabulário vêm do dataset.
