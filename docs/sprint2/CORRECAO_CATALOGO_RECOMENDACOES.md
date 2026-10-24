# Correção — Página inicial e recomendações (Sprint 2)

## Erros encontrados no ZIP recebido

1. `web/index.html` continha quatro livros de demonstração escritos no próprio HTML, sem ligação com o PostgreSQL.
2. `web/recomendacoes.html`, sem parâmetro `?id`, usava o **primeiro livro do catálogo** como referência, mesmo com livros salvos pelo usuário.
3. O endpoint `/livros/{id}/recomendacoes` podia falhar com HTTP 500 se a tabela `livros_similares` não existisse. O sistema já tinha fallback de categoria, mas a exceção era lançada antes de alcançá-lo.

## Alterações

- A página inicial consulta `GET /livros?pagina=1&tamanhoPagina=4` e mostra apenas títulos existentes no banco. Se o banco estiver vazio ou a API indisponível, mostra uma mensagem real, sem livros fictícios.
- A busca digitada na página inicial é transferida para o formulário de `/pesquisa.html?busca=...`.
- `recomendacoes.html` sem `?id` exige login e consulta `GET /usuarios/{idUsuario}/livros-salvos`. Considera até oito salvos recentes, solicita as recomendações livro a livro usando o endpoint existente, descarta livros que a pessoa já salvou e elimina duplicatas.
- `recomendacoes.html?id=123` continua exibindo recomendações do livro `123`, mesmo que não esteja salvo.
- O backend continua preferindo a tabela de similaridade TF-IDF. Caso **apenas a tabela esteja ausente**, usa outros livros da mesma categoria como alternativa. Outras falhas de banco não são ocultadas.
- Resultados de categoria **não mostram uma porcentagem inventada**. Apenas o modelo treinado apresenta o score real de similaridade.

## Como testar no Windows / VS Code

**1. Preserve** seu `src/Livros.Api/appsettings.Development.json` local, contendo a configuração para o seu banco `livros_pi`. Ele não acompanha o ZIP de distribuição, pois pode conter senha.

**2. Reinicie a API** (interrompa a instância antiga com `Ctrl+C` antes):

```powershell
dotnet run --project src/Livros.Api --launch-profile http
```

**3. Em outro terminal, inicie o frontend:**

```powershell
python -m http.server 5500 -d web
```

**4. Confira as páginas:**

- `http://localhost:5267/livros`: JSON com o catálogo (deve ser o banco `livros_pi`).
- `http://localhost:5500/index.html`: cards de livros reais, não `Nome do Livro` / `Outra História`.
- `http://localhost:5500/pesquisa.html`: pesquisa com dados da API.
- `http://localhost:5500/login.html`: entre na sua conta.
- `http://localhost:5500/salvos.html`: confirme que há pelo menos um título salvo.
- `http://localhost:5500/recomendacoes.html`: recomendações dos salvos, excluindo títulos já salvos.
- `http://localhost:5500/recomendacoes.html?id=ID`: recomendações de um livro específico do banco.

Depois de atualizar os arquivos, pressione **Ctrl+Shift+R** no navegador para atualizar o JavaScript sem cache.

## Verificar os dados para recomendação

No pgAdmin, selecione `livros_pi` e execute:

```sql
SELECT COUNT(*) AS livros_cadastrados FROM public.livros;
SELECT COUNT(*) AS livros_salvos FROM public.livros_salvos;
SELECT to_regclass('public.livros_similares') AS tabela_modelo;
```

Se `tabela_modelo` retornar `NULL`, o sistema usa a categoria em vez do modelo de mineração. Para os resultados TF-IDF, crie a tabela pela migration **após verificar o estado das migrations existentes** e execute o treino com persistência descrito em `ml/README.md`.

Se já houver uma tabela `livros_similares`, é possível conferir sua quantidade com `SELECT COUNT(*) FROM public.livros_similares;`. Não execute esta consulta se a tabela estiver ausente.

Se não existirem **outros livros relacionados no catálogo**, o sistema mostrará uma mensagem informativa em vez de inventar recomendações. Salvar um livro não cria automaticamente linhas em `livros_similares`; isso depende do pipeline ML. A alternativa por categoria, por outro lado, não depende de treinamento.

## Testes automatizados locais

```powershell
node --test tests/frontend/recomendacoes.test.cjs
```

São quatro testes sem pacotes npm: catálogo real da API, recomendações baseadas em salvos, estado sem login e recomendação por livro escolhido.

**Limitação:** neste ambiente foram executados os testes de JavaScript e os 19 testes Python, mas **não foi possível executar o build .NET nem conectar ao PostgreSQL da sua máquina**. A execução integrada deve ser validada localmente.
