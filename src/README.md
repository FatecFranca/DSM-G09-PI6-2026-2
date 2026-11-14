# API e site web

A API em ASP.NET Core (`src/`) e o site em React (`web/`) formam o NextRead que o usuário vê. A API não
treina nenhum modelo: o pipeline em [`../ml`](../ml/README.md) grava os vizinhos de cada livro em
`livros_similares`, e a API só lê essa tabela. Como subir tudo do zero está no
[README principal](../README.md#como-rodar-localmente).

## API

### Stack

| Camada | Tecnologia |
|---|---|
| Runtime | .NET 10 |
| API | ASP.NET Core (controllers) + OpenAPI/Swagger |
| ORM | EF Core 10 + Npgsql |
| Nomes de coluna | `EFCore.NamingConventions` (snake_case automático) |
| Senha | `PasswordHasher<T>` (PBKDF2, do próprio ASP.NET Core) |
| Banco | PostgreSQL 18 |
| Testes | xUnit + EF Core InMemory (`tests/Livros.Api.Testes`) |

### Projetos

```
src/
├── Livros.Dominio/     entidades puras, sem dependência de EF
├── Livros.Dados/       ContextoLivros, configurações de mapeamento, migrations
└── Livros.Api/         controllers, DTOs, services, mensageria, Program.cs
```

`Livros.Api` referencia os dois; `Livros.Dados` referencia `Livros.Dominio`.

### Rodar

A conexão com o banco vem de `src/Livros.Api/appsettings.Development.json` (não versionado; modelo
em `appsettings.Development.json.example`) ou da variável de ambiente
`ConnectionStrings__BancoLivros`:

```bash
dotnet run --project src/Livros.Api --launch-profile http
```

Swagger em `http://localhost:5267/swagger`. `GET /saude` mostra se o banco responde e se a
similaridade já foi calculada.

### Convenções

- Classes, métodos e propriedades em **PascalCase e português** (`LivrosController`,
  `ContextoLivros`); termos técnicos em inglês (`Controller`, `Service`, `Dto`).
- JSON em **snake_case**, igual às colunas do banco. A política é aplicada em `AddJsonOptions`
  (respostas) e em `ConfigureHttpJsonOptions` (Swagger); sem o segundo, o Swagger mostraria
  camelCase.
- Consultas só de leitura usam `AsNoTracking()`.
- A busca escapa `%` e `_` digitados pelo usuário (`Filtros.MontarPadraoDeBusca`) antes do `ILIKE`.
- A coluna `categoria` guarda vários rótulos separados por vírgula. `CategoriasService` usa
  `FromSql` com `LATERAL unnest(string_to_array(...))` para separá-los, o único SQL escrito à mão.

### Modelo de dados

As tabelas com dados de usuário são criadas pelos scripts em `database/` e mapeadas com
`ExcludeFromMigrations()`, então nenhuma migration mexe nelas:

| Tabela | Script | Conteúdo |
|---|---|---|
| `usuarios`, `livros`, `livros_salvos`, `interacoes` | `01_criar_tabelas.sql` (+ `04_mensageria.sql`) | contas, catálogo, biblioteca e eventos |
| `avaliacoes` | `05_avaliacoes.sql` | nota de 1 a 5 por usuário e livro (única por par) |

Só `livros_similares` é criada por migration: chave `(id_livro, posicao)`, com `id_livro_similar` e
`score`. O pipeline de ML preenche essa tabela.

### Segurança

- Sessão por cookie `HttpOnly`. As rotas de usuário só aceitam o titular da sessão.
- Toda requisição que altera dados (POST, PUT, PATCH, DELETE) exige o header
  `X-NextRead-Request: 1`, que protege contra CSRF.
- O `senha_hash` nunca sai da API: o `UsuarioDto` não tem esse campo.
- A listagem de todos os usuários exige o papel de administrador, que ainda não foi concedido a ninguém.

### Endpoints

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/auth/cadastro` | público | cadastra e já inicia a sessão |
| POST | `/auth/entrar` | público | verifica a senha e inicia a sessão |
| GET | `/auth/me` | sessão | perfil próprio (401 para visitante) |
| POST | `/auth/sair` | sessão | encerra a sessão |
| GET | `/livros` | público | lista paginada; `pagina`, `tamanhoPagina`, `categoria`, `busca` |
| GET | `/livros/{id}` | público | detalhe; com sessão, publica o evento `visualizacao` |
| GET | `/livros/{id}/recomendacoes` | público | parecidos com o livro; `total` de 1 a 50 |
| GET | `/categorias` | público | categorias separadas, com a contagem de livros |
| GET, PUT, DELETE | `/livros/{id}/avaliacao` | sessão | nota do usuário: `{ "nota": 1..5 }` ou `null` |
| GET | `/usuarios/me/para-voce` | sessão | lista "Para você"; `total` de 1 a 50 (padrão 20) |
| GET, POST, DELETE | `/usuarios/{id}/livros-salvos[/{idLivro}]` | titular | biblioteca; publica `salvou` e `removeu_salvo` |
| GET, PUT, DELETE | `/usuarios/{id}` | titular | conta; `PUT /usuarios/{id}/senha` troca a senha (exige a atual) |
| POST | `/usuarios` | público | cadastro mantido por compatibilidade; prefira `/auth/cadastro` |
| GET | `/usuarios` | administrador | lista paginada de contas |
| GET | `/saude` | público | estado do banco e da similaridade |

### Recomendações

**Parecidos com este livro** (`/livros/{id}/recomendacoes`): lê o top-N já calculado em
`livros_similares` (`origem: "tabela"`). Se o modelo ainda não foi treinado, devolve livros da
mesma categoria (`origem: "categoria"`, sem pontuação).

**Para você** (`/usuarios/me/para-voce`): KNN baseado em itens, calculado na hora em C#
(`CalculadoraParaVoce` e `ParaVoceService`):

- Cada livro do usuário tem um peso `nota − 3` (5 → +2, 3 → 0, 1 → −2). Livro só salvo vale +1;
  se também tiver nota, vale a nota.
- Cada um dos 10 vizinhos desse livro em `livros_similares` recebe `peso × similaridade`, e a
  soma dá a pontuação. Uma nota baixa afasta os vizinhos daquele livro.
- Ficam de fora os livros do usuário e os que somaram zero ou menos.
- O dataset trata cada edição como um livro diferente ("Pride and Prejudice (Penguin Classics)",
  "Pride & Prejudice"...). Por isso os títulos são comparados sem o que está entre parênteses, sem
  pontuação e com "&" lido como "and": a lista não sugere outra edição de um livro do usuário e
  mostra cada obra uma vez só.
- Motivos: os até 2 livros do usuário que mais contribuíram positivamente.
- Se os vizinhos não chegam ao total pedido, a lista é completada com livros da categoria do livro
  de maior nota (primeiro a categoria idêntica, depois as que começam pela principal). Esses itens
  vêm com `origem: "categoria"`.
- Sem nenhuma nota alta nem livro salvo, a resposta é `origem: "sem_dados"` com a lista vazia.

| Livro sugerido | Vizinho de | Soma |
|---|---|---|
| Quincas Borba | Dom Casmurro, 5★ (0,62) e O Cortiço, 4★ (0,40) | 2×0,62 + 1×0,40 = **1,64** |
| Lua Nova | Crepúsculo, 1★ (0,80) | −2×0,80 = **−1,60** (não aparece) |

### Mensageria

A API publica `visualizacao`, `salvou` e `removeu_salvo` numa fila do Azure Service Bus por meio de
`IPublicadorDeInteracoes`, depois que a ação deu certo no banco. Sem a configuração `ServiceBus`, a
API usa um publicador desligado e continua funcionando. O lado do consumidor está em
[`../mensageria/README.md`](../mensageria/README.md).

## Site web (`web/`)

React 19 + Vite + TypeScript, com React Router, CSS Modules e testes em Vitest + Testing Library.
A identidade visual (creme, marrons, serifa nos títulos) fica nos tokens de
[`web/src/estilos/tokens.css`](../web/src/estilos/tokens.css), referência para o mobile e o desktop.

### Rodar

Precisa da API em `http://localhost:5267`.

```bash
cd web
npm ci
npm run dev          # http://localhost:5500 (porta fixa: o CORS da API só libera a 5500)
npm test             # Vitest
npm run typecheck
npm run lint         # oxlint
npm run build        # gera web/dist
```

A base da API vem de `VITE_API_URL` (copie `web/.env.example` para `web/.env`). Sem ela, o site usa
`localhost:5267` quando roda em localhost e a API do Render nos demais casos
(`web/src/api/cliente.ts`). Todas as chamadas usam `credentials: 'include'` e mandam o header
`X-NextRead-Request: 1` nas alterações.

### Páginas

| Rota | Conteúdo |
|---|---|
| `/` | apresentação, busca e destaques do catálogo |
| `/explorar` | busca e filtro por categoria, paginado |
| `/livro/:id` | detalhe, salvar na biblioteca e estrelas de 1 a 5 (logado) |
| `/recomendacoes` | "Para você" (logado), com o motivo de cada sugestão |
| `/recomendacoes?livro=:id` | parecidos com um livro, com a porcentagem de similaridade |
| `/biblioteca` | livros salvos |
| `/entrar` | entrar ou criar conta |

Os endereços do protótipo antigo (`index.html`, `pesquisa.html?busca=`, `livro.html?id=`,
`salvos.html`...) redirecionam para as rotas novas.

### Publicar no Render (Static Site)

Ao mergear a `PI6-Sprint3` na `main`, quem tem acesso ao painel ajusta o serviço
`nextread-frontend` (o endereço não muda, então a API não precisa de alteração):

| Configuração | Valor |
|---|---|
| Root Directory | `web` |
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist` |
| Redirects/Rewrites | `/*` → `/index.html` (tipo **Rewrite**) |
| Environment | `VITE_API_URL=https://dsm-g09-pi6-2026-2.onrender.com` e `NODE_VERSION=24` |

Depois do deploy, abra `https://nextread-frontend.onrender.com/livro/1` direto e recarregue a
página: se aparecer 404, o rewrite está faltando.

## Testes

```bash
dotnet test src/Livros.slnx
cd web && npm test
```

O smoke test (`tests/smoke/verificar_api.py`) roda contra a API de verdade e confere:
- 401 sem sessão e o header anti-CSRF;
- cadastro, login e saída;
- acesso só ao próprio perfil e à própria biblioteca;
- salvar e remover livros.

Ele cria e apaga duas contas temporárias, então use só em banco de desenvolvimento:

```bash
python tests/smoke/verificar_api.py --base-url http://localhost:5267
```
