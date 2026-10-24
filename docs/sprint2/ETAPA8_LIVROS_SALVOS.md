> **Atualização da Etapa 9:** o seletor de ID de teste e o bloqueio em produção descritos abaixo foram substituídos por autenticação por cookie e autorização por titular. Consulte `ETAPA9_AUTENTICACAO.md`. O restante deste documento é histórico da Etapa 8.

# Etapa 8 — Livros salvos (desenvolvimento)

## Implementação

- `GET /usuarios/{idUsuario}/livros-salvos` — lista livros salvos e dados dos livros.
- `POST /usuarios/{idUsuario}/livros-salvos/{idLivro}` — salva livro (201), retorna registro existente (200) sem duplicar.
- `DELETE /usuarios/{idUsuario}/livros-salvos/{idLivro}` — remove o vínculo (204).
- 404 para usuários/livros inexistentes; ids inválidos retornam 400.
- Frontend: `salvos.html` carrega dados reais, pesquisa e ordena; `livro.html` tem botão salvar.
- Schema existente `livros_salvos` possui chave única `(id_usuario, id_livro)`.

## IMPORTANTE: Segurança

**Este fluxo é exclusivamente para desenvolvimento local.** O ID digitado NÃO autentica o usuário. Os endpoints retornam HTTP 501 quando `ASPNETCORE_ENVIRONMENT` não é `Development`. Não habilite este recurso publicamente antes de implementar login/autorização baseada na identidade do usuário. O seletor usa `sessionStorage`, não armazena senha; não use dados reais.

## Teste manual

1. Configure o PostgreSQL e inicialize `database/01_criar_tabelas.sql` e `database/02_dados_teste.sql`.
2. Execute a API com `ASPNETCORE_ENVIRONMENT=Development` e confirme `GET /pronto`.
3. Crie um usuário de teste via `POST /usuarios` (campos `nome`, `email`, `senha`; veja `src/Livros.Api/Dtos/UsuarioDtos.cs`) e anote o `id_usuario` retornado.
4. Abra o frontend com `python -m http.server 5500 -d web`. Em `salvos.html`, informe o ID de teste.
5. Em `pesquisa.html`, abra um livro e clique em **Salvar livro**; volte a `salvos.html` para conferir.
6. Teste busca, ordenação e remoção; confirme no PostgreSQL com `SELECT * FROM livros_salvos;`.
7. Repita o POST do mesmo livro e confirme que não cria um segundo registro.

## Limites de validação

A API .NET e PostgreSQL não foram executados neste ambiente. Verifique compilação, conectividade e fluxo completo localmente. A gravação de salvamentos simultâneos pode resultar em erro de unicidade durante uma corrida; ajustar se for necessário para produção.
