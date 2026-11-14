# Pipeline de mineração de dados — Python

Ingestão do dataset, recomendação por conteúdo e experimentos de classificação
supervisionada. **Não é um serviço HTTP**: os scripts rodam pontualmente. A API em
[`../src`](../src) lê a tabela `livros_similares` preenchida pelo treinamento, e
não depende do Python para responder requisições.

```
CSV → limpeza → PostgreSQL (livros)
                       ├─ TF-IDF + cosseno ──────────────┐
                       └─ classificador supervisionado   │
                          (opcional: categorias ausentes)│
                                   ↓                    │
                            TF-IDF + cosseno ───────────┤
                                                        ↓
                                               livros_similares → API C#
```

## Stack

| Etapa | Ferramenta |
|---|---|
| Leitura e limpeza do CSV | pandas |
| Vetorização | scikit-learn `TfidfVectorizer` |
| Classificação | `MultinomialNB` com seleção `SelectKBest(chi2)` |
| Avaliação | divisão treino/teste, F1 e métricas de categoria (proxy) |
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
│   ├── RecomendacaoService.py  TF-IDF, cosseno, persistência do top-N
│   ├── ClassificacaoService.py  classificação supervisionada + chi²
│   └── AvaliacaoService.py   proxy de avaliação do top-N
├── Scripts/
│   ├── CarregarDataset.py
│   ├── TreinarRecomendador.py
│   ├── TreinarClassificador.py
│   └── AvaliarRecomendador.py
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

## Complemento de Machine Learning — Aprendizado supervisionado

A classificação é **opcional**, preserva o recomendador existente e não requer
nova tabela, migration, endpoint nem mudanças no frontend/mobile/desktop.
O classificador usa **título, autor e descrição** para prever a **categoria principal**.
A categoria **não** é fornecida como entrada ao classificador (impede vazamento
explícito do rótulo). Categorias pouco frequentes ficam fora do experimento.

### 3. Treinar e avaliar o classificador

Depois de carregar o catálogo no banco:

```bash
python -m Scripts.TreinarClassificador
```

A execução realiza:

1. Identificação do problema: classificação de gêneros a partir dos textos;
2. Pré-processamento e seleção de registros com categoria conhecida;
3. Divisão estratificada **80% treino / 20% teste**, com seed 42;
4. Baseline **TF-IDF + Multinomial Naive Bayes**;
5. Seleção supervisionada **SelectKBest(chi²)** ajustada **somente no treino**;
6. Comparação no mesmo conjunto de teste: acurácia, precisão/recall/F1 por classe,
   F1 macro/ponderado e matriz de confusão;
7. Ajuste do artefato final com todos os exemplos rotulados, após a avaliação.

Arquivos produzidos (ignorados no git):

- `artefatos/modelo-categorias.joblib` — classificador treinado;
- `artefatos/avaliacao-classificacao.json` — métricas **reais**, a calcular no seu banco.

Opções para experimentos:

```bash
python -m Scripts.TreinarClassificador --suporte-minimo 50 --max-categorias 15 --k-atributos 5000 --max-features 40000
```

> Os valores das métricas dependem do catálogo local. O relatório não acompanha
> o ZIP porque o dataset e o banco de produção não foram fornecidos.

### 4. Integrar ao recomendador, sem quebrar a API

O comando **sem `--hibrido` permanece idêntico ao original**:

```bash
python -m Scripts.TreinarRecomendador --persistir
```

Para testar a variação híbrida **sem alterar os resultados no banco**:

```bash
python -m Scripts.TreinarRecomendador --hibrido
python -m Scripts.AvaliarRecomendador --amostra 300 --top-n 10
```

A variação híbrida utiliza o classificador **apenas quando a categoria do livro
está vazia**. Textos desconhecidos ou com confiança abaixo de 0,75 permanecem sem
categoria, como antes. Categorias existentes jamais são substituídas. A confiança
do Naive Bayes é heurística (não calibrada), e o ganho deve ser avaliado.

Se os resultados forem adequados, **somente então** atualize a tabela operacional:

```bash
python -m Scripts.TreinarRecomendador --hibrido --limiar-categoria 0.75 --persistir
```

A gravação continua sendo feita na **mesma tabela** `livros_similares` e no mesmo
formato `(id_livro, posicao, id_livro_similar, score)`. A API C# não sabe se o
modelo utilizado era tradicional ou híbrido. A atualização substitui os pares
anteriores dentro da transação do banco: execute num horário adequado e faça
backup se necessário.

**Reversão** (retorna ao recomendador original):

```bash
python -m Scripts.TreinarRecomendador --persistir
```

### 5. Avaliar as recomendações

```bash
python -m Scripts.AvaliarRecomendador --amostra 300 --top-n 10
```

O script usa um modelo TF-IDF salvo e uma amostra reproduzível de livros com
categoria conhecida. Salva `artefatos/avaliacao-recomendacoes.json` contendo
cobertura e coincidência de **categoria principal**. Essa taxa é uma **proxy**
de similaridade temática, **não** Precision@K validada por usuários e não é
evidência de maior satisfação. Compare relatórios da configuração original e
híbrida, preservando cópias antes de retreinar.

## Testes

```bash
pytest
```

29 testes automatizados, nenhum precisa de banco. Cobrem ingestão, ordenação e
matemática da recomendação, classificação, seleção de atributos, persistência e
inferência do artefato em disco, não inferir categoria sem termos reconhecidos,
integração com campos ausentes e avaliação exploratória.

**Testes de integração ainda necessários no ambiente do projeto:** executar os
scripts com o dataset real e banco PostgreSQL, conferir métricas, total de linhas
em `livros_similares` e resposta do endpoint `GET /livros/{id}/recomendacoes`.
O projeto não inclui `BooksDataset.csv`, acesso ao banco, nem dados/artefatos
já treinados; por isso não há alegação de melhoria medida em produção.

## Limitações conhecidas

1. **31,9% dos livros não têm descrição** — para esses, a recomendação sai fraca.
2. **TF-IDF não entende sinônimo** — "car" e "automobile" são termos sem relação.
   Embeddings semânticos (`sentence-transformers` + `pgvector`) resolveriam.
3. **Recomendação igual para todo mundo** — é livro→livro, sem personalização.
   As tabelas `interacoes` e `livros_salvos` ainda não entram no modelo.
4. **Peso de autor domina** — nos exemplos reais, o nome do autor puxa mais o score que
   o tema. O botão é `PesoDosAutores` em `RecomendacaoService.py`.
5. **Só funciona em inglês** — `stop_words="english"` e o vocabulário vêm do dataset.
6. **Classificador opcional** — prevê somente categoria principal entre classes frequentes,
   e a confiança do Naive Bayes pode ser superestimada; não é recomendação por comportamento.
7. **Avaliação do top-N** — coincidência de categoria é métrica exploratória, não validação
   com julgamentos humanos nem melhora garantida.
