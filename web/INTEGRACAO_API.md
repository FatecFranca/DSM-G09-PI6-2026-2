# Integração frontend–backend (Sprint 2)

A página `pesquisa.html` agora chama `GET /livros` e `GET /categorias`. A página `livro.html?id=123` chama `GET /livros/123`. Busca, filtro por categoria e paginação utilizam a API, sem dados fictícios.

## Como executar

1. Tenha PostgreSQL instalado, com o esquema e os registros de livros do projeto carregados. Confira a configuração do banco no README em `src/`.
2. Na raiz do repositório, execute `dotnet run --project src/Livros.Api --launch-profile http`. A API deve abrir em `http://localhost:5267`.
3. Em outro terminal, execute `python -m http.server 5500 -d web` a partir da raiz do projeto. Abra `http://localhost:5500/pesquisa.html`.
4. Teste uma pesquisa pelo título, selecione uma categoria, avance a paginação e clique em **Ver detalhes**.

Caso use uma porta/endereço diferente para o backend, altere `API_BASE` em `web/Javascript/script.js`. O backend já possui CORS configurado no `Program.cs`.

## Limites desta etapa

- O filtro por ano foi removido porque a API atual não oferece essa opção.
- O botão de salvar está desabilitado: seu endpoint ainda não está implementado.
- A seção de recomendações está em outra página e ainda precisa de integração própria.
- O código foi verificado estaticamente; para confirmar a integração ponta a ponta é necessário executar API + banco + frontend.
