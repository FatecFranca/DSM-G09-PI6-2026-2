# NextRead Mobile

Aplicativo React Native + Expo + TypeScript para Android e iOS, integrado à API ASP.NET Core existente. A interface está em português e segue o roxo `#4C3898` e o fundo claro do site NextRead.

## Colocar no projeto

Extraia a pasta `mobile/` na raiz de `DSM-G09-PI6-2026-2`, ao lado de `src/`, `ml/` e `web/`. O pacote usa o ZIP fornecido como base de contrato e foi comparado com o repositório remoto, incluindo a branch `PI6-Sprint2` (commit `0b14f2535ee6f67460cbb51938780fee37bdacce`). A branch `main` consultada não contém a autenticação presente no ZIP. Use o backend do ZIP ou uma branch que contenha os mesmos endpoints; não sobreponha o backend com a versão antiga da `main`.

Não é necessário alterar o banco, repetir o treino do TF-IDF ou substituir o site para adicionar o aplicativo.

## Executar no Windows

Pré-requisito: Node.js 22.13 ou superior. As versões Expo 58 / React Native 0.88 / React 19.3 seguem o template oficial instalado e estão fixadas em `package-lock.json`. Use um cliente Expo compatível com SDK 58; se o Expo Go da loja não suportar esse SDK, use uma compilação nativa ou uma versão compatível disponível oficialmente.

No terminal, na raiz do projeto:

```powershell
cd mobile
npm ci
Copy-Item .env.example .env
npm start
```

Abra o QR Code no cliente Expo compatível. Computador e celular precisam alcançar o Metro pela mesma rede. Para emulador Android, execute `npm run android` com o emulador aberto. Para o simulador iOS, use `npm run ios` em um Mac com Xcode. Nenhum APK ou IPA já compilado está incluído.

## Endereço da API

O padrão é o mesmo endereço público usado pelo JavaScript do ZIP:

```dotenv
EXPO_PUBLIC_API_URL=https://dsm-g09-pi6-2026-2.onrender.com
```

Para trocar, edite `.env` e reinicie o Expo (`npx expo start --clear`). Esse endereço é público e vai para o aplicativo; nunca coloque senha, chave ou string de conexão do PostgreSQL em `EXPO_PUBLIC_*`.

| Ambiente | Endereço de exemplo |
|---|---|
| API pública | `https://dsm-g09-pi6-2026-2.onrender.com` |
| Emulador Android padrão | `http://10.0.2.2:5267` |
| Celular físico na mesma rede | `http://192.168.0.10:5267` (troque pelo IP do computador) |
| Simulador iOS no mesmo Mac | `http://localhost:5267` |

No celular, `localhost` é o próprio celular. Para testes locais, execute a API escutando em todas as interfaces, na raiz do repositório:

```powershell
$env:ASPNETCORE_ENVIRONMENT = "Development"
# Configure também as variáveis do banco, conforme src/README.md.
dotnet run --project src/Livros.Api --no-launch-profile --urls http://0.0.0.0:5267
```

Permita a porta 5267 no firewall para a rede privada. HTTP local é voltado ao ambiente de desenvolvimento; clientes nativos compilados podem bloquear tráfego sem TLS. Para distribuição, use a API HTTPS.

O aplicativo nativo não depende de CORS de navegador. O modo web (`npm run web`) serve como apoio de desenvolvimento: configure a origem exata mostrada pelo Expo nas origens CORS da API, com credenciais. Cookies cross-site também dependem das políticas do navegador, por isso o teste web não substitui o teste nativo.

## O que está implementado

| Tela | Recursos |
|---|---|
| Explorar | Catálogo real, busca por título/autor, categorias, paginação, atualizar e tentar novamente |
| Detalhes | Capa com alternativa quando indisponível, metadados, descrição, salvar/remover e livros semelhantes |
| Salvos | Biblioteca do usuário autenticado, atualização e estado vazio |
| Para você | Recomendações a partir de até oito salvos recentes, sem repetir livros e sem sugerir os já salvos |
| Conta | Cadastro, login, edição de nome/e-mail, troca de senha e logout |

A navegação usa abas inferiores e histórico de detalhes. O botão Voltar do Android retorna ao detalhe anterior ou ao catálogo. Textos e controles têm rótulos de acessibilidade, suporte a tamanho de fonte e áreas seguras da tela.

## Integração e sessão

O aplicativo usa os campos JSON `snake_case` e os endpoints existentes:

- `GET /livros`, `/categorias`, `/livros/{id}` e `/livros/{id}/recomendacoes`;
- `POST /auth/cadastro`, `/auth/entrar` e `/auth/sair`; `GET /auth/me`;
- `GET /usuarios/{id}/livros-salvos`; `POST` e `DELETE /usuarios/{id}/livros-salvos/{livro}`;
- `PUT /usuarios/{id}` e `/usuarios/{id}/senha`.

O cliente envia `credentials: include` e `X-NextRead-Request: 1`, exigidos pelo backend do ZIP. A sessão continua baseada no cookie HttpOnly emitido pela API. Senhas e cookies não são gravados em AsyncStorage nem copiados para o código JavaScript. Após entrar, o app confirma `/auth/me`; ao receber 401 de um recurso protegido, limpa os dados privados da interface. A restauração ao abrir depende da sessão ainda válida no transporte nativo; não há promessa de login permanente.

Valide a propagação do cookie no Android e no iOS de destino. HTTPS, configuração do cookie, prazo de sessão e chaves de proteção de dados permanecem responsabilidades do backend existente. Nenhuma mudança de JWT foi introduzida.

Recomendações com `origem: tabela` são identificadas como semelhança de conteúdo TF-IDF; `origem: categoria` aparece como sugestão por categoria, sem apresentar pontuação como probabilidade. Falhas parciais mantêm as sugestões disponíveis e mostram aviso.

## Organização

| Arquivo | Responsabilidade |
|---|---|
| `App.tsx` | Navegação, histórico de detalhes e botão Voltar |
| `src/client.ts` | Cliente HTTP testável, credenciais, timeout e erros |
| `src/api.ts` | URL da API por ambiente |
| `src/types.ts` | Contratos da API |
| `src/session.tsx` | Usuário atual e biblioteca, isolamento entre sessões |
| `src/Catalog.tsx` | Busca, categorias e paginação |
| `src/BookDetails.tsx` | Detalhes, salvar/remover e similares |
| `src/Library.tsx` | Salvos e recomendações pessoais |
| `src/recommendations.ts` | Agregação e remoção de duplicatas |
| `src/Account.tsx` | Formulários da conta |
| `src/ui.tsx` | Componentes e identidade visual |
| `tests/` | Testes de contratos HTTP e recomendações |

## Validação realizada

```powershell
npm run typecheck
npm test
npx expo export --platform android --platform ios --platform web
```

- TypeScript: aprovado.
- Dez testes automatizados: aprovados. Incluem credenciais/header, campos de login/senha, codificação de filtros, remoção HTTP 204, expiração HTTP 401, erros de validação/rede e agregação de recomendações.
- Bundles Android, iOS e web: exportados com sucesso. Exportar JavaScript/Hermes não equivale a gerar ou instalar APK/IPA.
- A execução visual automatizada não pôde ser concluída por restrição do navegador no ambiente. Não foi validado em celular/emulador nem com login real no PostgreSQL. As tentativas de leitura do catálogo público tiveram timeout; `/auth/me` respondeu 401 sem sessão, como esperado. Esses limites não foram mascarados com dados de demonstração no aplicativo.

## Roteiro de teste no celular

1. Abra o catálogo e procure um título; altere a categoria e carregue outra página.
2. Abra um livro, confira os metadados e os similares; use Voltar.
3. Crie uma conta de teste e confirme que a sessão abre a biblioteca.
4. Salve dois livros, abra Salvos e confira a persistência ao atualizar.
5. Abra Para você; confira que não há duplicatas ou livros já salvos.
6. Edite o perfil e troque a senha; saia e entre com a nova senha.
7. Remova um salvo; saia da conta e confirme que os dados privados desapareceram.
8. Repita com outra conta e confirme a separação das bibliotecas.
9. Desligue a conexão, confira o erro e use Tentar novamente ao reconectar.

## Gerar um APK para apresentação

Com uma conta Expo própria e o endereço HTTPS da API configurado:

```powershell
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android --profile preview
```

O perfil `preview` em `eas.json` pede um APK instalável. O processo remoto exige configuração/conta e não foi executado nesta entrega. Para publicar, revise identificadores de pacote, assinatura e requisitos das lojas.

Referências: [Expo SDK](https://docs.expo.dev/versions/latest/), [variáveis de ambiente](https://docs.expo.dev/guides/environment-variables/), [builds Android](https://docs.expo.dev/build-reference/apk/).
