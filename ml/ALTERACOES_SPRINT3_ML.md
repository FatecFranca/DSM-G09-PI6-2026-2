# Complemento de Mineração de Dados — Sprint 3

## Objetivo

Manter o recomendador de livros do NextRead e acrescentar uma demonstração
reprodutível de aprendizado supervisionado e seleção de atributos, de acordo
com os conteúdos estudados. O sistema não passa a prever vendas e não precisa
implementar clustering ou Apriori: não são tarefas necessárias ao caso de uso.

## Funcionalidades

- **Aprendizado não supervisionado / similaridade**: recomendações por TF-IDF e cosseno existentes, preservadas.
- **Aprendizado supervisionado**: classificação da categoria principal dos livros com `MultinomialNB`, usando título, autores e descrição sem incluir a categoria no texto de entrada.
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
