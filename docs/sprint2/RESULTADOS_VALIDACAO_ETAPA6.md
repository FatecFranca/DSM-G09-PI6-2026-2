# Etapa 6 — Validacao do backend e PostgreSQL

## Entrega desta etapa

- Adicionado `tests/smoke/verificar_api.py`: cliente de testes HTTP com biblioteca padrao do Python, sem dependencia de pytest.
- Adicionado `tests/smoke/README.md`: comandos de compilacao, inicializacao, testes e captura de evidencias no Windows.
- O teste usa email aleatorio no dominio `.invalid` e tenta remover o usuario de teste inclusive em caso de erro.
- Nenhum arquivo de configuracao com senha real foi adicionado.

## Resultado verificavel neste ambiente

- Inspecao das rotas e DTOs existentes: concluida.
- Validacao de sintaxe do script de testes (`python -m py_compile`): executada.
- `dotnet restore`, `dotnet build`, `dotnet run`: **NAO EXECUTADOS** (SDK .NET indisponivel).
- Conexao PostgreSQL e migracoes: **NAO EXECUTADAS** (servidor PostgreSQL indisponivel).
- Testes HTTP reais: **NAO EXECUTADOS** (API nao iniciada).

## Proximos passos necessarios

Executar `tests/smoke/README.md` no computador da equipe, guardar saidas de compilacao, testes e imagens reais, e registrar resultados neste relatorio. Nao tratar a etapa como validacao concluida ate que o smoke test tenha sido executado contra o backend e banco locais.
