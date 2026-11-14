# Complemento de Mineração de Dados — Sprint 3

## Objetivo

Manter o recomendador de livros do NextRead e acrescentar uma demonstração
reprodutível de aprendizado supervisionado e seleção de atributos, de acordo
com os conteúdos estudados. O sistema não passa a prever vendas. Apriori não foi
implementado; a clusterização entrou depois, para cobrir o aprendizado não supervisionado
(ver `../docs/mineracao-de-dados.md`).

## Funcionalidades

- **Similaridade**: recomendações por TF-IDF e cosseno existentes, preservadas.
- **Aprendizado não supervisionado**: clusterização KMeans sobre o TF-IDF reduzido com TruncatedSVD, com método do cotovelo, silhouette e comparação dos grupos com os gêneros (`ClusterizacaoService.py`).
- **Aprendizado supervisionado**: classificação da categoria principal dos livros, comparando classe majoritária, `MultinomialNB` (com e sem chi²), KNN padrão com chi² e KNN com cosseno, usando título, autores e descrição sem incluir a categoria no texto de entrada.
- **Seleção de atributos**: `SelectKBest(chi2)` e comparação com baseline sem seleção no mesmo conjunto de teste.
- **Pré-processamento e validação**: limpeza prévia existente, filtro de categorias raras, divisão treino/teste estratificada, F1 macro/ponderado, acurácia, métricas por classe e matriz de confusão.
- **Pós-processamento**: relatório JSON da classificação e avaliação exploratória das recomendações por coincidência de categoria principal.
- **Integração operacional opcional**: o modo `--hibrido` utiliza o classificador para completar *somente* categorias ausentes antes de gerar o TF-IDF, mediante confiança mínima; não altera diretamente a tabela `livros`.

## Compatibilidade

- Banco: nenhuma nova tabela ou migration; mantém o schema PostgreSQL/EF Core.
- API: endpoint `GET /livros/{id}/recomendacoes` e DTOs mantidos.
- Frontend web, aplicativo mobile e demais clientes: sem alterações.
- Padrão: `python -m Scripts.TreinarRecomendador --persistir` mantém o funcionamento anterior.
- Ativação do híbrido: exige treinamento prévio e a flag explícita `--hibrido`.
- Reversão: retreinar/regravar o recomendador padrão sem `--hibrido`.

## Execução e validação

Veja o passo a passo em `ml/README.md`. Os testes unitários passaram com 29 casos,
sem acesso à internet ou a PostgreSQL, em Python 3.13 / scikit-learn 1.8 no ambiente
de desenvolvimento do pacote. O repositório declara versões diferentes em
`requirements.txt` e deve ser testado com as versões instaladas no projeto.

**Limite desta entrega:** o ZIP de entrada não inclui `BooksDataset.csv`, acesso
ao PostgreSQL real ou artefatos treinados. Não é possível comprovar ainda melhoria
de métricas nem certificar um deploy; é preciso validar com os dados e serviços
reais antes de usar `--persistir` no banco compartilhado.

**Validação com o banco real (14/11/2026):** com Python 3.14 / scikit-learn 1.9 e o
catálogo completo (99.310 livros), `python -m Scripts.ExecutarMineracao` rodou em ~2 min.
O Naive Bayes + chi² ficou com F1 macro 0,466 e o KNN padrão com chi² com 0,173; o KNN com
distância de cosseno, com 0,629, virou o artefato. A suíte tem 43 testes passando. O modo `--hibrido` com `--persistir` ainda não
foi executado no banco compartilhado.
