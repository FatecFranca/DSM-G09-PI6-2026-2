# Resultados — Etapa 9 (autenticação)

## Verificado neste ambiente

- `node --check web/Javascript/script.js`: **aprovado** (sintaxe JavaScript).
- `python -m py_compile tests/smoke/verificar_api.py`: **aprovado** (sintaxe Python).
- `python -m pytest -q ml/testes`: **19 testes aprovados** (mineração de dados).
- Validação das referências de scripts HTML e presença dos IDs necessários nos formulários/telas: **aprovada**.

## Não executado

- `dotnet restore`, `dotnet build`, testes C# em execução: **SDK .NET ausente neste ambiente**.
- PostgreSQL + ASP.NET Core + frontend em conjunto: **não executado**.
- Teste HTTP de autorização e autenticação: **script criado, não executado**.
- Cloud Run, Cloud SQL e integração HTTPS em produção: **não testado**.

## Para validar na equipe

1. Executar `dotnet restore src/Livros.slnx` e `dotnet build src/Livros.slnx --no-restore`.
2. Inicializar PostgreSQL segundo `database/README.md`.
3. Subir a API com connection string por variável de ambiente e `--launch-profile http`.
4. Iniciar frontend `python -m http.server 5500 -d web`.
5. Executar `python tests/smoke/verificar_api.py --base-url http://localhost:5267` em banco de desenvolvimento.
6. Testar visualmente registro, entrada, salvamento e saída; conferir DevTools (rede/cookie HttpOnly, sem senha no JSON).
7. Anexar capturas reais na pasta `docs/sprint2/evidencias/`.

Não declare a integração como testada antes de completar estes passos.
