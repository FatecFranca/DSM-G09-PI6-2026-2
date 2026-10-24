# Etapa 7 — Recomendações integradas

## Alterações
- Corrigidos os caminhos `Javascript/script.js` em `index.html`, `salvos.html` e `recomendacoes.html`.
- A página `recomendacoes.html` agora consulta `GET /livros/{id}/recomendacoes?total=12` e apresenta os títulos reais.
- Com `?id=123`, o usuário obtém recomendações semelhantes ao livro 123. Sem parâmetro, a página usa o primeiro livro do catálogo.
- O percentual exibido representa similaridade do algoritmo, **não** afinidade pessoal nem probabilidade de gostar.
- Não há botões de salvar funcionais nesta página até que exista API para livros salvos.

## Teste manual
1. Inicie PostgreSQL com as tabelas e dados necessários.
2. Inicie a API pelo perfil HTTP e abra o frontend em um servidor web local.
3. Visite `pesquisa.html`, escolha um livro e abra sua página de detalhes.
4. Clique no link para livros semelhantes; verifique se a URL contém `recomendacoes.html?id=...`.
5. Confira os títulos e as pontuações exibidos contra o retorno de `/livros/{id}/recomendacoes?total=12`.
6. Se nenhum resultado existir, verifique se o processo de mineração gerou registros em `livros_similares`.

## Limitação
Verificação realizada sem backend .NET e PostgreSQL em execução. Portanto, a integração HTTP real permanece pendente de teste no ambiente do grupo. A página ainda usa a constante `API_BASE` do script compartilhado.
