# Sprint 2 — PostgreSQL (NextRead)

Esta etapa completa o **script de criação das quatro tabelas-base**, que são mapeadas no EF Core com `ExcludeFromMigrations()`. A quinta tabela (`livros_similares`) **continua sendo criada pela migration C# existente**. Não rode o script de teste em produção.

## Pré-requisitos

- PostgreSQL instalado e em execução, com acesso pelo pgAdmin ou `psql`.
- .NET SDK compatível com o projeto (`src/Livros.Api`).
- Banco `livros_pi` criado pelo pgAdmin (Database → Create → Database) ou com `CREATE DATABASE livros_pi;` conectado ao banco administrativo `postgres`. **Não** rode `CREATE DATABASE` dentro de uma transação.
- Connection string `ConnectionStrings__BancoLivros` configurada com as credenciais do seu PostgreSQL. Não faça commit de senhas pessoais.

## Ordem correta (pgAdmin Query Tool, conectado ao banco `livros_pi`)

1. Execute `01_criar_tabelas.sql`. Ele cria `usuarios`, `livros`, `livros_salvos`, `interacoes`; se essas tabelas já existirem, não apaga dados.
2. Na raiz do repositório execute a migration existente, que cria `livros_similares`:

   ```powershell
   dotnet ef database update --project src/Livros.Dados --startup-project src/Livros.Api
   ```

   Se `dotnet ef` não estiver instalado: `dotnet tool install --global dotnet-ef` (use a versão major compatível com o EF Core do projeto). Se o projeto já possui a tabela e a migration está registrada, o EF Core não deve recriá-la.
3. Execute `02_dados_teste.sql` no pgAdmin. Ele insere até **12 livros fictícios**, de forma idempotente quanto a pares título/autor. É apenas um conjunto de demonstração, não o dataset usado no trabalho de mineração.
4. Execute `03_verificar_banco.sql`. A saída deve listar as cinco tabelas e mostrar **ao menos 12 livros** em um banco vazio criado com esses passos.
5. Inicie a API com:

   ```powershell
   dotnet run --project src/Livros.Api --launch-profile http
   ```

6. Abra `http://localhost:5500/pesquisa.html` com o servidor frontend iniciado conforme `web/INTEGRACAO_API.md`, ou consulte `GET /livros` no Swagger. Confira a porta da API no perfil escolhido.

## Alternativa com dataset real

A importação de `BooksDataset.csv` já é implementada por `ml/Scripts/CarregarDataset.py`, documentada em `ml/README.md`. O arquivo CSV **não está incluído no ZIP**. A importação exige instalar as dependências Python e configurar `BANCO_URL`. Se quiser usar o dataset completo, execute a ingestão em um banco limpo **em vez** de misturar a demonstração com o catálogo real. **Não use `--limpar` sem entender que ele apaga livros e, por cascata, seus dados associados.**

## Evidências para o Teams

Capture: (1) execução bem-sucedida dos scripts; (2) consulta de totais e exemplos de livros; (3) `GET /livros` retornando JSON; (4) página de pesquisa mostrando livros reais retornados pela API. São evidências a coletar **após executar localmente**, não incluídas como se já tivessem sido testadas.

## Observações

- `CREATE TABLE IF NOT EXISTS` não atualiza nem valida o formato de tabelas já existentes. Em bancos antigos, compare as colunas com as entidades C# antes de executar a API.
- A tabela `livros_similares` pode ficar vazia até executar o treinamento de recomendações; isso não impede buscas por livros.
- Para personalizar as credenciais sem colocá-las no Git, no PowerShell do terminal atual use `$env:ConnectionStrings__BancoLivros = "Host=localhost;Port=5432;Database=livros_pi;Username=postgres;Password=SUA_SENHA"`; para a mineração use `ml/.env` (não versionado).
