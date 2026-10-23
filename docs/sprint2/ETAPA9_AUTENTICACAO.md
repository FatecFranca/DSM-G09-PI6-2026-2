# Etapa 9 — Cadastro, login e controle de acesso

## O que foi implementado

- `POST /auth/cadastro` — valida dados, grava usuário com `PasswordHasher<Usuario>` (PBKDF2) e inicia sessão (HTTP 201).
- `POST /auth/entrar` — valida senha pelo hash, inicia sessão (200) ou retorna credenciais inválidas (401).
- `GET /auth/me` — retorna **somente** os dados públicos do usuário autenticado; sem sessão retorna 401.
- `POST /auth/sair` — invalida o cookie da sessão no navegador (204).
- `GET /usuarios/{id}`, `PUT /usuarios/{id}`, `PUT /usuarios/{id}/senha`, `DELETE /usuarios/{id}` — exigem sessão do próprio titular. A lista global `/usuarios` exige papel de administrador, não concedido pelo cadastro público.
- `GET|POST|DELETE /usuarios/{id}/livros-salvos[/{idLivro}]` — exigem sessão com o mesmo `id` presente na URL. ID de outra pessoa retorna HTTP 403.
- `web/login.html` — formulário completo para criar conta e entrar.
- `web/salvos.html` — não pede mais ID de teste. A sessão identifica a biblioteca.
- `web/livro.html` — salvar só é permitido após login.
- Cabeçalho do site apresenta botão para encerrar a sessão.

## Pré-requisitos e execução (Windows, VS Code)

1. Banco `livros_pi` no PostgreSQL e scripts `database/01_criar_tabelas.sql`, migration e `database/02_dados_teste.sql` executados.
2. .NET SDK 10 instalado; configure a connection string no terminal que executa a API, **nunca no repositório**:

```powershell
$env:ConnectionStrings__BancoLivros = "Host=localhost;Port=5432;Database=livros_pi;Username=postgres;Password=SUA_SENHA"
dotnet restore src/Livros.slnx
dotnet build src/Livros.slnx --no-restore
dotnet run --project src/Livros.Api --launch-profile http
```

3. Em outro terminal, publique os arquivos web na mesma máquina, usando **localhost** em ambas as URLs:

```powershell
python -m http.server 5500 -d web
```

4. Acesse `http://localhost:5500/login.html` e cadastre um usuário com senha de pelo menos 8 caracteres. Você deverá ser redirecionado à biblioteca. Abra `pesquisa.html`, escolha um livro, clique em **Salvar**, confira na biblioteca e saia da sessão.
5. Execute, em um terceiro terminal (somente banco de desenvolvimento):

```powershell
python tests/smoke/verificar_api.py --base-url http://localhost:5267
```

O smoke test cria e exclui duas contas temporárias, testa cadastro/login/logout, impede acesso a dados e salvos de outra conta e verifica salvamento se houver livros.

## Contrato de requisições

Chamadas mutáveis (`POST`, `PUT`, `PATCH`, `DELETE`) exigem o header `X-NextRead-Request: 1` para rejeitar formulários cross-site. No navegador a função `requisitarApi()` o fornece automaticamente, envia `credentials: "include"` e **nunca lê o cookie HttpOnly**. Para testes manuais JSON, forneça `Content-Type: application/json` e o header de proteção.

Exemplo `curl.exe` (a autenticação exige preservar cookies; veja o script de smoke para um teste completo):

```powershell
curl.exe -i -X POST http://localhost:5267/auth/entrar -H "Content-Type: application/json" -H "X-NextRead-Request: 1" -d '{"email":"teste@example.com","senha":"SenhaTeste123!"}'
```

A URL da API no front permanece `http://localhost:5267` até a Etapa 10. **Não use 127.0.0.1 para uma parte e localhost para a outra** durante o teste de cookies SameSite.

## Medidas de segurança e limites

- Senhas são armazenadas como **hash**, não em texto puro, e jamais retornadas pela API.
- Cookie: `HttpOnly`, `SameSite=Lax`, sessão sem persistência entre reinicializações do navegador; `Secure` obrigatório fora de Development (HTTPS).
- CORS só permite origens explicitamente configuradas com credenciais; no Development aceita `http://localhost:5500` e `http://127.0.0.1:5500`. Em produção configure `Cors__OrigensPermitidas__0=https://SEU-FRONTEND`.
- Os endpoints de login/cadastro têm limite simples de 10 solicitações por minuto por IP. Limites maiores de proteção contra abuso devem ser configurados antes da disponibilização pública.
- A identidade da URL de livros salvos é comparada **no servidor** com o ID autenticado; não confiar em sessão/localStorage/ID do navegador.
- Em **Cloud Run com múltiplas instâncias**, configure persistência/compartilhamento das chaves do ASP.NET Core Data Protection para que cookies permaneçam válidos após restart/scale. Em ambiente com frontend e API em sites diferentes, `SameSite=Lax` não sustenta chamadas cross-site: prefira proxy de mesma origem ou arquitetura com política de cookies/CSRF revisada.
- Falta confirmar configuração HTTPS/proxy para implantação real. Não publique o front em HTTP aberto fora do ambiente local.
- Funcionalidades de recuperação de senha, verificação de e-mail e autenticação multifator ainda **não** estão implementadas.
- Atualizações futuras podem adicionar revogação imediata de sessões e auditoria de acessos.

## Validação realizada nesta entrega

- O arquivo `web/Javascript/script.js` passou em `node --check`.
- O smoke test Python passou pela compilação de sintaxe.
- **Não foi executado** `dotnet build` nem teste de API com PostgreSQL, pois essas ferramentas não estão disponíveis neste ambiente. Execute os comandos acima para obter evidências antes da entrega.
