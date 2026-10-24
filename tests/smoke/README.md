# Etapa 9 — Smoke test de cadastro, autenticação, autorização e biblioteca

Requisitos: .NET SDK 10, PostgreSQL com tabelas/dados inicializados, Python 3.10+. Rode somente em banco de **desenvolvimento**; duas contas temporárias são criadas e removidas.

Na raiz do projeto:

```powershell
$env:ConnectionStrings__BancoLivros = "Host=localhost;Port=5432;Database=livros_pi;Username=postgres;Password=SUA_SENHA"
dotnet restore src/Livros.slnx
dotnet build src/Livros.slnx --no-restore
dotnet run --project src/Livros.Api --launch-profile http
```

Segundo terminal:

```powershell
python tests/smoke/verificar_api.py --base-url http://localhost:5267
```

O script confere 401 sem sessão, header anti-CSRF, cadastro, login, saída, acesso apenas ao próprio perfil, não acesso aos livros salvos de outro usuário, salvamento/remoção (com livros no banco), e exclusão das contas temporárias. Se a limpeza falhar, verifique o banco manualmente.

**Não há resultado de execução HTTP real nesta entrega.** Registre as saídas do build e do script como evidência ao rodar localmente.
