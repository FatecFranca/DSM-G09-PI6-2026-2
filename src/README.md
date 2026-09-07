# API — C# / ASP.NET Core

Back-end HTTP do NextRead. Não contém machine learning: o modelo é treinado pelo
pipeline em [`../ml`](../ml), que grava o resultado na tabela `livros_similares`.
A API só lê essa tabela.

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | .NET 10 |
| API | ASP.NET Core (controllers) + OpenAPI/Swagger |
| ORM | EF Core 10 + Npgsql |
| Nomes de coluna | `EFCore.NamingConventions` (snake_case automático) |
| Senha | `PasswordHasher<T>` (PBKDF2, do próprio ASP.NET Core) |
| Banco | PostgreSQL 18 |

## Projetos

```
src/
├── Livros.Dominio/     entidades puras, sem dependência de EF
├── Livros.Dados/       ContextoLivros, configurações de mapeamento, migrations
└── Livros.Api/         controllers, DTOs, services, Program.cs
```

`Livros.Api` referencia os dois; `Livros.Dados` referencia `Livros.Dominio`.

## Convenções

Classes, métodos, arquivos e propriedades em **PascalCase e português**
(`LivrosController`, `GetLivros`, `ContextoLivros`). Termos técnicos ficam em inglês
(`Controller`, `Service`, `Dto`).

O JSON sai em **snake_case**, igual às colunas do banco:

```csharp
opcoes.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
```

Isso é aplicado em dois lugares — `AddJsonOptions` (o que a API devolve) e
`ConfigureHttpJsonOptions` (o que o Swagger documenta). Sem o segundo, o Swagger
mostraria camelCase enquanto a API responde snake_case.

## Modelo de dados

Quatro tabelas vêm do time de modelagem e a API **não as altera** — o mapeamento é
marcado com `ExcludeFromMigrations()`, então nenhuma migration toca nelas:

- `usuarios`, `livros`, `livros_salvos`, `interacoes`

Uma tabela é da API e entra nas migrations:

- `livros_similares` — `(id_livro, posicao)` como chave, `id_livro_similar` e `score`.
  Preenchida pelo pipeline de ML, lida pelo endpoint de recomendações.

Se depois o time decidir que o EF Core deve ser dono do schema inteiro, basta remover
as chamadas de `ExcludeFromMigrations()` nas configurações em `Livros.Dados/Configuracoes`.

## Como rodar

Ajuste a connection string em `Livros.Api/appsettings.json`, ou sobrescreva por variável
de ambiente (útil no deploy, e evita commitar senha):

```bash
set ConnectionStrings__BancoLivros=Host=localhost;Port=5432;Database=livros_pi;Username=postgres;Password=SUA_SENHA
```

Aplique a migration:

```bash
dotnet ef database update --project src/Livros.Dados --startup-project src/Livros.Api
```

Suba a API:

```bash
dotnet run --project src/Livros.Api
```

Swagger em `http://localhost:<porta>/swagger`. A porta aparece no console.

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| GET | `/livros` | lista paginada; `pagina`, `tamanhoPagina`, `categoria`, `busca` |
| GET | `/livros/{idLivro}` | detalhe do livro |
| GET | `/livros/{idLivro}/recomendacoes` | similares; `total` (1–50) |
| GET | `/categorias` | categorias atômicas com contagem |
| GET | `/usuarios` | lista paginada; `pagina`, `tamanhoPagina`, `busca` |
| POST | `/usuarios` | cria usuário |
| GET | `/usuarios/{idUsuario}` | detalhe |
| PUT | `/usuarios/{idUsuario}` | atualiza nome e email |
| PUT | `/usuarios/{idUsuario}/senha` | troca a senha (exige a atual) |
| DELETE | `/usuarios/{idUsuario}` | remove |
| GET | `/saude` | estado do banco e se a similaridade já foi calculada |

O `senha_hash` nunca sai da API — o `UsuarioDto` não tem esse campo.

O campo `origem` na resposta de recomendações diz de onde veio o resultado:

- `tabela` — top-N pré-calculado em `livros_similares` (caminho normal);
- `categoria` — plano B por categoria, quando o modelo ainda não foi treinado.

## Detalhes que valem saber

**Consulta de categorias.** A coluna `categoria` guarda vários rótulos separados por
vírgula. `CategoriasService` usa `FromSql` com `LATERAL unnest(string_to_array(...))`
para quebrar em categorias atômicas — o único SQL escrito à mão no projeto.

**Busca.** `%` e `_` digitados pelo usuário são escapados em `Filtros.MontarPadraoDeBusca`
antes de virarem padrão do `ILIKE`, senão viravam curinga.

**Leitura.** Toda consulta que só serializa JSON usa `AsNoTracking()`.
