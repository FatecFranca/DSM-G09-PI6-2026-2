# Mineração de dados — Python

Ingestão do dataset, recomendador por conteúdo e os experimentos de mineração de dados: classificação
de gênero (supervisionado) e clusterização (não supervisionado), documentados pelas fases do
**CRISP-DM**. **Não é um serviço HTTP:** os scripts rodam pontualmente. A API em [`../src`](../src/README.md)
lê a tabela `livros_similares` preenchida pelo treino e não depende do Python para responder.

```
CSV → limpeza → PostgreSQL (livros)
                       ├─ TF-IDF + cosseno ──────────────┐
                       └─ classificador supervisionado   │
                          (opcional: categorias ausentes)│
                                   ↓                     │
                            TF-IDF + cosseno ────────────┤
                                                         ↓
                                                livros_similares → API C#
```

## Stack

| Etapa | Ferramenta |
|---|---|
| Leitura e limpeza do CSV | pandas |
| Vetorização | scikit-learn `TfidfVectorizer` |
| Classificação | `MultinomialNB`, `SelectKBest(chi2)` e `KNeighborsClassifier` |
| Clusterização | `TruncatedSVD` + `MiniBatchKMeans` |
| Similaridade | numpy + scipy.sparse |
| Gráficos | matplotlib |
| Banco | psycopg 3, sem ORM (o schema pertence ao EF Core) |
| Runtime | Python 3.14 |

Não há SQLAlchemy de propósito: o dono do schema é o EF Core, no lado C#. Duas definições da mesma
tabela divergiriam mais cedo ou mais tarde.

## Estrutura

```
ml/
├── Mineracao/
│   ├── Configuracao.py          .env
│   ├── BancoDados.py            conexão psycopg
│   ├── IngestaoService.py       limpeza do CSV + carga por COPY
│   ├── RecomendacaoService.py   TF-IDF, cosseno, persistência do top-N
│   ├── ClassificacaoService.py  classificação supervisionada (modelos comparados)
│   ├── ClusterizacaoService.py  TF-IDF → SVD → KMeans, cotovelo e silhouette
│   ├── GraficosService.py       matriz de confusão e curvas de k (PNG)
│   └── AvaliacaoService.py      proxy de avaliação do top-N
├── Scripts/
│   ├── CarregarDataset.py
│   ├── TreinarRecomendador.py
│   ├── TreinarClassificador.py
│   ├── TreinarClusterizacao.py
│   ├── ExecutarMineracao.py     classificador + clusterização num comando só
│   └── AvaliarRecomendador.py
├── figuras/                     gráficos usados neste documento
├── testes/                      pytest, roda sem banco
└── artefatos/                   modelos e relatórios gerados (fora do git)
```

## Como rodar

```bash
cd ml
python -m venv .venv
.venv\Scripts\activate            # linux/mac: source .venv/bin/activate
pip install -r requirements-dev.txt
copy .env.example .env            # linux/mac: cp .env.example .env
```

Ajuste `BANCO_URL` no `.env`. Aqui o formato é **URL** (`postgresql://...`), que é o que o psycopg
entende, diferente do `Host=...;Database=...` da API. É o mesmo banco, escrito de dois jeitos. As
tabelas precisam existir antes (veja o [README principal](../README.md#2-banco-de-dados)).

### 1. Ingestão

O `BooksDataset.csv` fica na raiz do repositório, fora do git (descompacte o `.zip`).

```bash
python -m Scripts.CarregarDataset
```

Se a tabela `livros` já tiver dados, o script avisa e não faz nada. `--limpar` recarrega, mas
**apaga os livros e, em cascata, os dados ligados a eles** (salvos, avaliações, interações).

| Coluna do CSV | Tratamento |
|---|---|
| `Title` | normaliza espaços; linha sem título é descartada |
| `Authors` | tira o prefixo `By ` e sufixos de função (`(COM)`, `(EDT)`, …) |
| `Description` | normaliza espaços; vazio vira `NULL` |
| `Category` | `" History , General"` → `"History, General"`, sem repetição |
| `Publisher` | normaliza espaços |
| `Price` | `"Price Starting at $8.79"` → `8.79`; zero e lixo viram `NULL` |
| `Publish Date` | `"Friday, January 1, 1993"` → mês `Janeiro` + ano `1993` |

Títulos repetidos do mesmo autor são descartados (`--manter-duplicados` desliga isso). A carga é
feita por `COPY`, não por `INSERT` linha a linha. Também funciona com o formato alternativo do
dataset, que traz `Price Starting With ($)`, `Publish Date (Month)` e `Publish Date (Year)` separados.

### 2. Recomendador

```bash
python -m Scripts.TreinarRecomendador --persistir
```

1. Monta o corpus: `título ×2 + categoria ×3 + autores ×2 + descrição`, para o gênero e a autoria
   pesarem mais que o texto corrido.
2. Vetoriza com `TfidfVectorizer` (`stop_words="english"`, `min_df=3`, `max_df=0.5`,
   `sublinear_tf`, `norm="l2"`, até 120 mil termos).
3. Salva o artefato em `artefatos/modelo-tfidf.joblib`.
4. Com `--persistir`, calcula o cosseno em blocos e grava os 10 vizinhos de cada livro em
   `livros_similares`.

Como a matriz sai normalizada em L2, o cosseno é só o produto interno. Não existe uma matriz
livros × livros inteira em memória: o cálculo vai em blocos de 256 livros. Os hiperparâmetros são
flags (`--min-df`, `--max-features`, `--ngram`), para comparar configurações sem editar código.

A API usa esses vizinhos de dois jeitos: "parecidos com este livro" e a lista individual "Para
você", que soma os vizinhos dos livros que a pessoa avaliou, pesados pela nota (veja
[`../src/README.md`](../src/README.md#recomendações)).

### 3. Mineração de dados

```bash
python -m Scripts.ExecutarMineracao
```

Roda o classificador e a clusterização em sequência (~2 min), imprime as métricas e salva em
`artefatos/` os relatórios (`avaliacao-classificacao.json`, `avaliacao-clusterizacao.json`), as
figuras e o modelo `modelo-categorias.joblib`. Todas as etapas usam semente fixa
(`random_state = 42`) e nenhuma tabela é alterada. As partes também rodam separadas:

```bash
python -m Scripts.TreinarClassificador     # --suporte-minimo, --max-categorias, --k-atributos, --max-features
python -m Scripts.TreinarClusterizacao     # --k, --valores-de-k, --componentes, --amostra
```

## Processo CRISP-DM

Os números abaixo vêm de uma execução real sobre o banco `livros_pi`, em 14/11/2026.

### 1. Entendimento do negócio

O NextRead recomenda livros parecidos com o que a pessoa está vendo. A recomendação é por conteúdo e
depende muito da **categoria**. Só que 25.634 dos 99.310 livros (25,8%) não têm categoria.

Daí saem duas perguntas de mineração:

- **Supervisionada:** dá para prever o gênero de um livro só pelo título, pelos autores e pela
  descrição? Se der, o classificador pode completar as categorias que faltam (modo `--hibrido` do
  recomendador).
- **Não supervisionada:** sem dizer quais são os gêneros, os livros se agrupam sozinhos por assunto?
  Os grupos que aparecem lembram os gêneros que o mercado usa?

Critério de sucesso: superar com folga a referência ingênua (chutar sempre o gênero mais comum) e
conseguir explicar os grupos encontrados.

### 2. Entendimento dos dados

- Origem: `BooksDataset.csv` (Kaggle), carregado na tabela `livros` pela ingestão.
- 99.310 livros; 73.676 com categoria; 67.016 com descrição.
- A categoria é hierárquica, separada por vírgula (`Fiction, Mystery & Detective, General`). Há
  3.096 combinações diferentes, mas só 58 valores no **primeiro nível**.
- O "lixo" de categorias (`DE`, `MD`, `WV)`) aparece só nos subníveis, por exemplo
  `Travel, United States, South, South Atlantic (DC, DE, FL, …)`. O primeiro nível é limpo.
- As classes são desbalanceadas: `Fiction` sozinho tem 17.379 livros (23,6% dos categorizados); o
  20º gênero (`Crafts & Hobbies`) tem 1.001.

### 3. Preparação dos dados

- **Rótulo (alvo):** primeiro nível da categoria. Ficaram os 20 gêneros mais frequentes (mínimo de
  30 livros cada), cobrindo 59.804 livros.
- **Atributos:** título (peso 2), autores e descrição. A categoria **nunca** entra no texto, nem no
  classificador nem na clusterização. Se entrasse, o modelo veria a resposta dentro da pergunta
  (vazamento).
- **Vetorização:** TF-IDF com acentos removidos, stop words em inglês, `sublinear_tf`, `min_df = 2`,
  `max_df = 0,95`, até 40.000 termos.
- **Divisão:** holdout estratificado 80/20 (47.843 treino / 11.961 teste). O vocabulário e a seleção
  de atributos são ajustados **só no treino**.
- **Clusterização:** usa os 99.310 livros com algum texto, inclusive os sem categoria. O TF-IDF é
  reduzido com TruncatedSVD (100 componentes) e normalizado (L2), para o KMeans trabalhar com
  distância parecida com a do cosseno.

### 4. Modelagem

**Supervisionado:** cinco modelos treinados e medidos no mesmo conjunto de teste.

| Modelo | Papel |
|---|---|
| Classe majoritária (`DummyClassifier`) | referência mínima: sempre chuta `Fiction` |
| Multinomial Naive Bayes | modelo probabilístico clássico para texto |
| Naive Bayes + `SelectKBest(chi²)` (10.000 termos) | seleção de atributos supervisionada |
| KNN + χ², configuração padrão (k = 5, distância euclidiana) | primeira tentativa com KNN, mantida para comparar |
| **KNN com distância de cosseno** (k = 25, voto ponderado pela similaridade) | o mesmo KNN, com a medida de distância adequada para texto |

O melhor modelo pelo F1 macro (nunca a classe majoritária) é retreinado com todos os livros
rotulados e vira o artefato `modelo-categorias.joblib`.

**Por que o cosseno no KNN.** O KNN classifica um livro pelo gênero dos k livros mais próximos, então
tudo depende de como a proximidade é medida. A distância euclidiana mede a linha reta entre dois
vetores e é sensível ao tamanho deles. Depois do χ², livros com poucas palavras selecionadas viram
vetores curtos, perto da origem, e ficam "próximos" uns dos outros só por isso. O cosseno mede o
ângulo entre os vetores, ou seja, se os textos falam dos mesmos assuntos, independente do tamanho. É
a mesma medida que o recomendador usa.

**Não supervisionado:** `MiniBatchKMeans`. O k foi avaliado em 10, 15, 20, 25, 30 e 40 pelo **método
do cotovelo** (inércia) e pelo **silhouette** (amostra fixa de 10 mil livros). O modelo final usa
**k = 20**, o mesmo número de gêneros do classificador, para poder comparar.

### 5. Avaliação

#### Classificação de gênero (teste com 11.961 livros)

| Modelo | Acurácia | F1 macro | F1 ponderado |
|---|---:|---:|---:|
| Classe majoritária | 0,291 | 0,023 | 0,131 |
| Naive Bayes | 0,591 | 0,371 | 0,522 |
| Naive Bayes + χ² | 0,642 | 0,466 | 0,589 |
| KNN + χ² (k = 5, euclidiana) | 0,378 | 0,173 | 0,290 |
| **KNN cosseno (k = 25, ponderado)** | **0,728** | **0,629** | **0,710** |

- O KNN com cosseno acerta o gênero de quase 3 em cada 4 livros: 2,5 vezes a referência, num
  problema com 20 classes.
- O F1 macro (média simples entre os gêneros) é a métrica principal, porque não deixa o `Fiction`,
  que é muito grande, esconder os gêneros pequenos.
- **O mesmo algoritmo vai de 0,173 para 0,629 de F1 macro só trocando a medida de distância.** No
  pré-processamento de texto, a escolha da distância pesa tanto quanto a escolha do algoritmo.
- A seleção χ² ajuda o Naive Bayes (+0,095 de F1 macro), mas atrapalha o KNN euclidiano, porque
  desequilibra o tamanho dos vetores (21 livros do teste ficam sem nenhum termo selecionado).
- Gêneros mais fáceis: `Cooking` (F1 0,864), `Fiction` (0,844), `Business & Economics` (0,799). Mais
  difíceis: `Social Science` (0,245), `Young Adult Fiction` (0,327), `Biography & Autobiography`
  (0,385). São gêneros "guarda-chuva" ou que dividem vocabulário com a ficção.
- As confusões mais comuns fazem sentido: `Juvenile Fiction` → `Fiction` (138 livros),
  `Young Adult Fiction` → `Fiction` (137), `Biography & Autobiography` → `Fiction` (129) e
  `Juvenile Nonfiction` → `Juvenile Fiction` (115). O texto fala do mesmo assunto; o que muda é o
  público.

**Por que o KNN com cosseno foi o escolhido:**

1. **Melhor resultado entre os algoritmos estudados** (Naive Bayes e KNN), com o maior F1 macro e a
   maior acurácia.
2. **Explicável:** dá para mostrar *por que* um livro recebeu um gênero listando os 25 livros mais
   parecidos e os gêneros deles.
3. **Coerente com o produto:** o recomendador e a lista "Para você" usam a mesma ideia (vizinhos
   mais próximos por cosseno sobre TF-IDF). É uma técnica só, reaproveitada em três lugares.
4. **Dá probabilidade:** a proporção ponderada dos votos funciona como confiança, e é o que o modo
   `--hibrido` usa para só completar categorias quando tem certeza (≥ 0,75).

Também testamos, fora do conteúdo da disciplina, uma regressão logística balanceada. Ela chegou a
0,686 de F1 macro, um pouco acima do KNN, mas ficou de fora porque não dá a explicação por vizinhos e
não reaproveita a mesma técnica do recomendador.

![Matriz de confusão](figuras/matriz-confusao.png)

#### Clusterização (99.310 livros)

| k | Inércia | Silhouette |
|---:|---:|---:|
| 10 | 79.678 | 0,028 |
| 15 | 76.920 | 0,036 |
| **20** | **74.092** | **0,045** |
| 25 | 71.466 | 0,054 |
| 30 | 69.345 | 0,062 |
| 40 | 66.123 | 0,075 |

![Cotovelo e silhouette](figuras/curvas-k.png)

- **Sem cotovelo nítido e silhouette baixo:** a inércia cai de forma quase linear e o silhouette
  sobe devagar com k, sempre perto de zero. Isso é comum em texto: os livros não formam grupos bem
  separados, os assuntos se misturam. Por isso o k foi escolhido pela interpretação (20, como os
  gêneros) e não por um "ótimo" que os dados não mostram.
- **Validação externa** contra os gêneros (73.676 livros com categoria): pureza 0,392, ARI 0,162,
  NMI 0,257. Os grupos têm relação com os gêneros, mas não são cópia deles.

Alguns grupos que o KMeans encontrou **sem saber os gêneros** (termos mais fortes do centróide):

| Grupo | Livros | Gênero dominante | Termos |
|---|---:|---|---|
| culinária | 3.464 | Cooking (91%) | recipes, cooking, dishes, food, desserts |
| livros de receita | 1.080 | Cooking (93%) | cookbook, recipes, dishes, cooking, desserts |
| policial | 5.219 | Fiction (84%) | mystery, murder, death, case, mysteries |
| romance/família | 8.889 | Fiction (73%) | novel, love, family, woman, mother |
| religião | 2.647 | Religion (72%) | god, life, faith, prayer, jesus |
| fantasia/ficção científica | 5.961 | Fiction (40%) | earth, magic, adventures, planet |
| guerra e história dos EUA | 5.026 | History (25%) | war, civil, states, american |
| casa e jardim | 4.518 | House & Home (22%) | home, projects, ideas, garden, decorating |

O KMeans achou subgêneros que a categoria de primeiro nível não separa: dentro de `Fiction`
apareceram grupos de policial, romance e fantasia. Também apareceram grupos "de forma", e não de
assunto, como coletâneas e clássicos (`stories, collection, classics, edition`) e livros infantis
ilustrados (`book, golden, little, read`).

#### Recomendações

```bash
python -m Scripts.AvaliarRecomendador --amostra 300 --top-n 10
```

Usa uma amostra reproduzível de livros com categoria conhecida e salva
`artefatos/avaliacao-recomendacoes.json` com a cobertura e a coincidência de **categoria principal**
entre o livro e os seus vizinhos. É uma **proxy** de similaridade temática, não Precision@K validada
por usuários.

### 6. Implantação

- O recomendador grava `livros_similares`, que a API lê para "parecidos com este livro" e para a
  lista "Para você".
- O classificador (KNN com cosseno, ~19 MB, porque guarda os livros de treino) fica em
  `artefatos/modelo-categorias.joblib`. O modo opcional `--hibrido` usa o classificador para
  completar **só** as categorias vazias, com confiança mínima de 0,75, antes de montar o TF-IDF.
  Categorias existentes nunca são trocadas, e a API lê `livros_similares` do mesmo jeito:
  ```bash
  python -m Scripts.TreinarRecomendador --hibrido                  # testa sem gravar
  python -m Scripts.AvaliarRecomendador --amostra 300 --top-n 10    # compara com o original
  python -m Scripts.TreinarRecomendador --hibrido --limiar-categoria 0.75 --persistir
  ```
  A gravação substitui os pares anteriores numa transação. Para voltar ao original, rode
  `python -m Scripts.TreinarRecomendador --persistir`. O `--hibrido --persistir` ainda não foi
  executado no banco compartilhado.
- A clusterização fica como análise exploratória; relatórios e figuras são regenerados pelo mesmo
  comando.

## Testes

```bash
pytest
```

43 testes, nenhum precisa de banco. Cobrem a ingestão, a ordenação e a matemática da recomendação,
a comparação de modelos e a escolha do artefato, a seleção de atributos, a inferência sem termos
reconhecidos, o modo híbrido com campos ausentes, a avaliação exploratória, a clusterização
(separação de temas, varredura de k, textos vazios, k inválido) e a geração das figuras.

## Limitações

1. **Edições repetidas:** o dataset trata cada edição como um livro, então os vizinhos de um clássico
   costumam ser outras edições dele. A lista "Para você" filtra isso na API; "parecidos com este
   livro" ainda mostra as edições.
2. **Peso do autor domina:** o nome do autor puxa mais o score que o tema. O ajuste é
   `PesoDosAutores` em `RecomendacaoService.py`.
3. **Sem descrição:** cerca de 32% dos livros não têm descrição; para eles o texto é só título,
   autores e categoria, e a recomendação sai mais fraca.
4. **TF-IDF não entende sinônimo:** "car" e "automobile" são termos sem relação. Embeddings
   semânticos (`sentence-transformers` + `pgvector`) resolveriam.
5. **Só inglês:** `stop_words="english"` e o vocabulário vêm do dataset.
6. **Classificador:** prevê só o primeiro nível da categoria entre os 20 gêneros mais frequentes; os
   38 raros ficaram fora. `Body, Mind & Spirit` vira `Body` porque a ingestão separa a categoria por
   vírgula.
7. **Clusterização:** os 100 componentes do SVD explicam 8,1% da variância do TF-IDF. Bastam para
   agrupar por assunto, mas perdem detalhes.
8. **Avaliação do top-N:** coincidência de categoria é métrica exploratória, não validação com
   julgamentos humanos.
