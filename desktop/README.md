# NextRead Desktop — Sprint 3

Aplicativo para **Windows (Electron)**, reconstruído para o **frontend atual React + TypeScript + Vite**. Não usa o script antigo que procurava `API_BASE` em `web/Javascript/script.js`.

## Pré-requisitos

- Windows 10/11 de 64 bits.
- Node.js **22.22.0 ou mais recente** e npm (verifique `node -v` e `npm -v`).
- Internet para instalar as dependências e acessar a API remota.
- Não precisa executar Python, ML, Azure Service Bus ou PostgreSQL na máquina do usuário: tudo isso permanece nos serviços já existentes.

## Passo a passo no PowerShell (na pasta raiz do repositório)

```powershell
cd web
npm ci
cd ..\desktop
npm install
npm run dev
```

O comando `npm run dev` compila a interface atual, copia os arquivos para `desktop/renderer` e inicia o Electron. **Não** inicie `electron .` antes de preparar a interface.

## Gerar o instalador Windows (.exe)

Na pasta `desktop/`:

```powershell
npm run dist:win
```

Resultado: `desktop/release/NextRead-Setup-1.0.0-x64.exe` (nome definido no `package.json`). Para criar versão sem instalador:

```powershell
npm run dist:portable
```

A geração do instalador é recomendada no **Windows**, onde será utilizado; o executável não está incluído no ZIP de código-fonte. Os arquivos em `desktop/release/` não devem ser commitados.

## Configuração da API

**Padrão:** `https://dsm-g09-pi6-2026-2.onrender.com` (mesma API configurada no frontend da Sprint 3).

O desktop usa o **mesmo backend e banco**, sem criar APIs paralelas. A interface é compilada com `VITE_API_URL=/api`, e o Electron oferece um servidor local em porta dinâmica que encaminha `/api/*` ao backend. Isso também permite que a autenticação com cookie funcione sem mudar o CORS da API.

Se estiver testando com a API local, no PowerShell antes de iniciar o app:

```powershell
$env:NEXTREAD_API_URL = 'http://localhost:5267'
npm run dev
```

Para voltar ao servidor padrão na mesma sessão:

```powershell
Remove-Item Env:NEXTREAD_API_URL
```

> A variável `NEXTREAD_API_URL` é lida pelo processo Electron. Não substitua isso por `VITE_API_URL` manualmente: o script de build já configura o endereço relativo `/api`. Não armazene senhas ou connection strings do Neon/Azure no desktop.

## Testes

```powershell
cd desktop
npm test
```

Testa o servidor local, a navegação do React, a validação de origem, o proxy de requests, autenticação (cookie HttpOnly) e a configuração. Os testes usam um backend falso e **não acessam** o Neon ou o Render.

Teste manual recomendado no Windows: iniciar o app, entrar com uma conta de teste, navegar por Explorar, Livro, Biblioteca e Recomendações, salvar/remover um livro, avaliar um livro e sair; repetir após gerar o `.exe`. Se a API no Render estiver temporariamente adormecida, a primeira requisição pode demorar.

## O que esta versão preserva

- Código atual de `web/`, sem mudanças de layout ou lógica;
- Login, cadastro, sessão, biblioteca, avaliações e recomendações, consumindo os mesmos endpoints;
- A lógica de ML, clustering e mensageria da Sprint 3, sem duplicar serviços no aplicativo;
- React Router com acesso às rotas `/explorar`, `/livro/:id`, `/biblioteca` e `/recomendacoes`.

## Segurança

O servidor HTTP escuta apenas em `127.0.0.1`, em porta dinâmica, e valida o Host/Origin. A janela Electron mantém sandbox, isolamento de contexto, sem Node Integration ou webviews, e bloqueia navegação para domínios externos. Cookies de sessão da API são entregues ao navegador local como HttpOnly, com atributos apropriados ao loopback. O arquivo de configuração não contém credenciais. **A aplicação requer conexão com a API** para dados e autenticação; não é um aplicativo de catálogo offline.

## Problemas conhecidos / resolução

- **`vite não é reconhecido`**: execute `cd web; npm ci` antes de `npm run dev`.
- **`API_BASE não encontrada`**: você está usando o script de outra sprint. Esta versão usa `desktop/scripts/preparar-web.cjs` e Vite.
- **Erro de Node incompatível**: atualize Node para 22.22+.
- **`não foi possível conectar ao servidor`**: confirme `/pronto` da API remota, ou configure `NEXTREAD_API_URL` para uma API local já iniciada.
- **Render lento na primeira chamada**: espere o backend subir; feche e abra a página ou reinicie o aplicativo se necessário.
- **Instalador não assinado**: o Windows pode apresentar aviso do SmartScreen. Assinatura de código é uma etapa opcional posterior e não foi configurada.

## Instalação sem compilar localmente: GitHub Actions

Incluí também `.github/workflows/desktop-windows.yml`. Depois do commit e push na branch
`PI6-Sprint3`, o workflow é disparado **automaticamente** quando há alterações em `desktop/` ou `web/` (caso o GitHub Actions esteja habilitado no repositório).
No GitHub, abra **Actions → Compilar NextRead Desktop (Windows)** e, ao concluir, baixe **NextRead-Desktop-Windows** em **Artifacts**. O botão manual **Run workflow** pode exigir que o workflow já esteja na branch padrão.
Isso cria o instalador no próprio Windows do GitHub sem exigir compilação local. O workflow não foi executado nesta entrega.
