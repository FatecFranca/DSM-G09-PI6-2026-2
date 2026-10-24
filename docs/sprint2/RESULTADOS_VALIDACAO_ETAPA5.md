# Etapa 5 — Validação técnica (ambiente de análise)

Verificações realizadas sobre o projeto da Etapa 4, com ajuste pontual em `ml/Mineracao/BancoDados.py`.

## Resultados

### Python unit tests: APROVADO

```text
...................                                                      [100%]
19 passed in 0.70s
```

### JavaScript syntax: APROVADO

```text
Comando executado sem mensagens de erro.
```

### Cloud deploy shell syntax: APROVADO

```text
Comando executado sem mensagens de erro.
```

### Python compilation: APROVADO

```text
Comando executado sem mensagens de erro.
```

## Correção aplicada

Em `ml/Mineracao/BancoDados.py`, a importação de `psycopg` foi movida para dentro da função `AbrirConexao()`, mantendo a integração PostgreSQL na execução real. Isso permite coletar e executar os testes unitários de transformação e recomendação sem instalar o driver do banco, quando esses testes não abrem conexões. O uso real do banco ainda **requer instalar** `ml/requirements.txt`.

## Limitações importantes

- O SDK `dotnet` não está instalado neste ambiente; não foi possível compilar ou executar a API ASP.NET Core 10.
- PostgreSQL e `psql` não estão disponíveis; scripts SQL e endpoints dependentes do banco não foram executados.
- Não foram realizadas implantação, autenticação ou testes de Cloud Run/Cloud SQL.
- Não foi executado teste de ponta a ponta no navegador.
- A autoria dos commits depende do histórico Git, que não acompanha os arquivos ZIP.
- As versões Python presentes neste ambiente podem diferir das versões fixadas nos arquivos de requisitos; os resultados não substituem a execução com as dependências oficiais.

## Próximos passos no computador da equipe

1. `cd src` e `dotnet restore`, seguido de `dotnet build Livros.slnx`.
2. Subir o PostgreSQL, criar o banco, executar os scripts de `database/` e rodar as migrations indicadas na documentação.
3. Executar `dotnet run --project Livros.Api` e testar `/pronto`, `/usuarios` e `/livros`.
4. Em um ambiente Python virtual, executar `pip install -r ml/requirements-dev.txt` e `python -m pytest -q ml/testes` a partir da raiz do projeto (ou `pytest -q` dentro de `ml/`).
5. Servir `web/` por HTTP e confirmar as requisições de pesquisa e detalhe pela aba Rede do navegador.
6. Capturar evidências reais; não marcar como aprovadas verificações que ainda não foram feitas.
