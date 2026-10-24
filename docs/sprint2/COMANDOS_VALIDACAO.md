# Comandos de apoio à validação (Windows PowerShell)

Execute a partir da raiz do repositório. Alguns passos pressupõem instalação prévia de .NET, PostgreSQL e Python.

## API

```powershell
$env:ConnectionStrings__BancoLivros = "Host=localhost;Port=5432;Database=livros_pi;Username=postgres;Password=SUA_SENHA"
dotnet restore src/Livros.slnx
dotnet build src/Livros.slnx
dotnet ef database update --project src/Livros.Dados --startup-project src/Livros.Api
dotnet run --project src/Livros.Api --launch-profile http
```

**Atenção:** execute `database/01_criar_tabelas.sql` antes da migration em banco novo. Rode `database/02_dados_teste.sql` pelo pgAdmin depois dela. Se o perfil `http` usar a porta documentada (5267), em novo terminal:

```powershell
Invoke-RestMethod -Uri http://localhost:5267/livros
Invoke-RestMethod -Uri http://localhost:5267/categorias
Invoke-RestMethod -Uri http://localhost:5267/saude
```

## Frontend

```powershell
python -m http.server 5500 -d web
```

Abra `http://localhost:5500/pesquisa.html`.

## Git (em clone com histórico)

```powershell
git fetch --all
git log origin/PI6-Sprint1 --format="%h | %an <%ae> | %s" --date=short
```

Conferir autores é apenas uma parte da evidência; analise as contribuições de cada integrante.

## Testes Python

```powershell
cd ml
python -m pip install -r requirements-dev.txt
python -m pytest
```

Os comandos estão registrados para execução posterior. Não há resultados de testes declarados neste documento.
