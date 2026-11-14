# DSM-G09-PI6-2026-2

Repositório do GRUPO 09 do Projeto Interdisciplinar do 6º semestre DSM 2026/2.

**Alunos:** Hudson Ribeiro, Maria Clara, Gustavo Schizzari e Eduardo Gibertoni

## O projeto

Sistema de recomendação de livros baseado em conteúdo. O dataset não traz avaliação de
usuário, então a recomendação vem dos metadados do próprio livro — título, categoria,
autores e descrição — via TF-IDF e similaridade de cosseno.

A aplicação também conta com uma interface web para exploração do catálogo, visualização
dos detalhes dos livros, gerenciamento de livros salvos e apresentação de recomendações
por similaridade de conteúdo.

## Organização

| Pasta | Responsável | O que tem |
|---|---|---|
| `src/` | back-end | API em C# / ASP.NET Core com EF Core |
| `ml/` | back-end | Pipeline Python: ingestão do dataset e modelo de recomendação |
| `web/` | front-end | Site em React + Vite + TypeScript integrado à API (catálogo, detalhes, biblioteca, recomendações e conta) |

O back-end é poliglota de propósito: a API é C# (tipagem em tempo de compilação e
migrations do EF Core) e a mineração de dados é Python (pandas e scikit-learn).
Os dois lados não conversam por HTTP — o Python grava o resultado do modelo na tabela
`livros_similares` e a API lê de lá.

O `BooksDataset.csv` fica na raiz, fora do versionamento (descompacte o `.zip` antes de
rodar a ingestão).

## Sprint 1 — entregue

- estrutura da API em ASP.NET Core, com Swagger e os endpoints do front
- CRUD de usuário, com senha guardada em hash (PBKDF2)
- mapeamento EF Core do schema do banco, mais a tabela `livros_similares`
- ingestão do `BooksDataset.csv`: limpeza, normalização e carga via `COPY`
- pipeline de ML: TF-IDF sobre o conteúdo do livro, cosseno em blocos e persistência
  do top-N para o endpoint não recalcular a cada requisição
- protótipo inicial do front-end desenvolvido em HTML e CSS
- identidade visual e layout responsivo inicial da aplicação
- navegação entre as principais telas do sistema
- tela inicial com apresentação da plataforma e campo de pesquisa
- tela de exploração e pesquisa do catálogo
- tela de detalhes do livro
- tela de livros salvos do usuário
- tela de recomendações personalizadas

### Front-end (histórico)

Nas Sprints 1 e 2 o front era um protótipo em HTML/CSS/JS puro (`index.html`, `pesquisa.html`,
`livro.html`, `salvos.html`, `recomendacoes.html`, `login.html`), que aos poucos passou a consultar
a API. Na Sprint 3 ele foi substituído pelo site em React descrito na seção
[Sprint 3](#sprint-3--front-end-em-react-e-nova-identidade-visual); os endereços `.html` antigos
continuam funcionando por redirecionamento.

## Arquitetura em Nuvem (Planejamento)

Para atender à arquitetura da aplicação e respeitar os Requisitos Não Funcionais (como performance e sistema modular), a infraestrutura foi desenhada de forma distribuída e assíncrona, utilizando o ecossistema **Google Cloud Platform (GCP)**:

- **Front-end:** Google Cloud Storage (Static Website Hosting) ou Firebase Hosting para servir os arquivos estáticos (HTML/CSS/JS) com alta disponibilidade e baixo custo.
- **Back-end (API C#):** Google Compute Engine (GCE) com instância `e2-micro` para hospedar a API ASP.NET Core, mantendo o controle do ambiente Linux e das dependências.
- **Banco de Dados:** Google Cloud SQL (PostgreSQL) para garantir a integridade relacional das tabelas de usuários, livros e interações, automatizando rotinas de backup e segurança.
- **Mineração de Dados e Mensageria (IA):** Arquitetura orientada a eventos. O planejamento previa Google Cloud Pub/Sub; na implementação (Sprint 3) foi adotado o **Azure Service Bus**, descrito na seção [Sprint 3 — Mensageria com Azure Service Bus](#sprint-3--mensageria-com-azure-service-bus).

Instruções de execução:

- API C#: [`src/README.md`](src/README.md)
- Pipeline de ML: [`ml/README.md`](ml/README.md)
- Consumidor de mensagens: [`mensageria/README.md`](mensageria/README.md)


## Sprint 2 — Preparação do banco de dados

Scripts e instruções para criar as tabelas-base, carregar livros fictícios de demonstração e verificar a conexão estão em [`database/README.md`](database/README.md). A tabela de similares continua gerenciada pela migration existente do EF Core.


## Sprint 2 — Computação em Nuvem II (Etapa 3)

Foram adicionados `cloud/Dockerfile`, `cloud/cloudbuild.yaml`, `cloud/deploy.sh` e o guia [`cloud/README.md`](cloud/README.md) para uma implantação inicial com Cloud Run, Cloud SQL e Secret Manager. **Configuração pronta no repositório; implantação real e evidências no GCP pendentes.** Esta implementação adota Cloud Run no lugar do Compute Engine descrito na seção histórica de planejamento acima.


## Sprint 2 — Etapa 9: login e autorização

O sistema agora possui cadastro e login com hash PBKDF2 por meio do `PasswordHasher<Usuario>` existente,
**cookie HttpOnly**, autenticação por sessão, logout, controle de acesso à biblioteca e autorização
para editar/apagar apenas a própria conta. A página `web/login.html` foi implementada, e
`salvos.html` não usa mais IDs digitados manualmente.

Os endpoints disponíveis são `POST /auth/cadastro`, `POST /auth/entrar`,
`GET /auth/me` e `POST /auth/sair`.

O script `tests/smoke/verificar_api.py` foi atualizado para testar sessão,
separação entre usuários e logout. **Não foi possível executar um build .NET ou uma
integração PostgreSQL neste ambiente**, portanto a validação final local permanece necessária.

As sessões por cookie são adequadas para o teste local com ambas as aplicações em
`localhost`. Para implantação pública, é necessário configurar HTTPS, origens CORS, proxy da
interface e persistência das chaves de proteção de dados entre instâncias.


## Sprint 2 — Correção do catálogo e recomendações

A página inicial agora carrega livros reais via `GET /livros`. A página de recomendações
consulta os livros salvos da sessão autenticada, reúne livros semelhantes sem repetir
livros já salvos e apresenta a origem das sugestões. Também continua possível acessar
`recomendacoes.html?id=ID` para comparar um livro específico com títulos semelhantes.

Quando a tabela `livros_similares` ainda não existe ou não foi preenchida, a API usa
outros livros da mesma categoria; não há pontuação TF-IDF nesse modo. O treino
continua sendo executado separadamente (veja `ml/README.md`).

## Sprint 3 — Front-end em React e nova identidade visual

O `web/` foi reescrito em **React + Vite + TypeScript** (requisito de front-end por framework) com a
identidade visual "Cafeteria" derivada da logo: creme, marrons, serifa nos títulos e pouca informação
por tela. O back-end não mudou. As cores, fontes e espaçamentos ficam em
[`web/src/estilos/tokens.css`](web/src/estilos/tokens.css), referência para o mobile e o desktop.

### Rodar o front localmente

Requisitos: Node 24 e a API rodando em `http://localhost:5267` (veja [`src/README.md`](src/README.md)).

```bash
cd web
npm ci
npm run dev        # http://localhost:5500 (porta fixa: o CORS da API libera só a 5500)
npm test           # testes do front (Vitest)
npm run build      # gera web/dist
```

Para apontar para outra API, copie `web/.env.example` para `web/.env` e ajuste `VITE_API_URL`.

Rotas: `/`, `/explorar`, `/livro/:id`, `/recomendacoes` (`?livro=:id`), `/biblioteca`, `/entrar`.
Os endereços antigos (`index.html`, `pesquisa.html?busca=`, `livro.html?id=`, `salvos.html`...)
redirecionam para as rotas novas.

### Publicar no Render (Static Site)

Na hora do merge da `PI6-Sprint3` na `main`, quem tem acesso ao painel ajusta o serviço
`nextread-frontend` (o endereço não muda, então a API não precisa de nenhuma alteração):

| Configuração | Valor |
|---|---|
| Root Directory | `web` |
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist` |
| Redirects/Rewrites | `/*` → `/index.html` (tipo **Rewrite**) |
| Environment | `VITE_API_URL=https://dsm-g09-pi6-2026-2.onrender.com` e `NODE_VERSION=24` (o `web/.node-version` também indica Node 24) |

Depois do deploy, abrir `https://nextread-frontend.onrender.com/livro/1` direto e recarregar a
página: se aparecer 404, o rewrite está faltando.

### Link do Site: [NextRead](https://nextread-frontend.onrender.com/)

## Sprint 3 — Mensageria com Azure Service Bus

A API e o consumidor de mensagens são dois sistemas separados, em linguagens diferentes, que
só conversam por uma fila do **Azure Service Bus**:

```
web/mobile ──HTTP──► API C# ──envia──► [Azure Service Bus: fila nextread-recomendacoes]
                                                   │
                       mensageria/ (Python) ◄──recebe──┘ ──grava──► PostgreSQL (interacoes)
```

- **Quem publica:** a API, depois que a ação deu certo no banco — `salvou` e `removeu_salvo`
  (livros salvos) e `visualizacao` (detalhe do livro, só com usuário logado). A resposta não
  espera o processamento; se o Service Bus estiver fora do ar ou sem configuração, a API só
  registra no log e continua funcionando.
- **Quem consome:** [`mensageria/`](mensageria/README.md), que confirma a mensagem quando grava,
  manda para a *dead-letter* quando ela é inválida e devolve para a fila quando o banco está fora.
- **Sem duplicar:** cada mensagem tem um `id_evento`; a coluna única em `interacoes`
  (`database/04_mensageria.sql`) impede gravar a mesma interação duas vezes quando o Service Bus
  reentrega a mensagem.

### Configurar

1. Banco: rodar `database/04_mensageria.sql` (local **e** produção; pode rodar mais de uma vez).
2. API: em `src/Livros.Api/appsettings.Development.json` (modelo em
   `appsettings.Development.json.example`), seção `ServiceBus` com `Conexao` (cadeia de conexão da
   política SAS da fila) e `Fila`. No Render: variáveis `ServiceBus__Conexao` e `ServiceBus__Fila`.
3. Consumidor: copiar `mensageria/.env.example` para `mensageria/.env` e preencher.

As cadeias de conexão nunca vão para o repositório.

### Testes

```bash
dotnet test src/Livros.slnx
cd mensageria && .venv/Scripts/python -m pytest
```

## Sprint 3 — Mineração de Dados

O pipeline em [`ml/`](ml/README.md) agora tem os dois tipos de aprendizado, documentados pelas
fases do CRISP-DM em [`docs/mineracao-de-dados.md`](docs/mineracao-de-dados.md):

- **Supervisionado:** classifica o gênero do livro (20 gêneros) a partir de título, autores e
  descrição, sem usar a categoria como entrada. Naive Bayes e KNN são comparados no mesmo teste;
  o escolhido é o **KNN com distância de cosseno**.
- **Não supervisionado:** KMeans sobre o TF-IDF reduzido com TruncatedSVD agrupa os 99.310
  livros por assunto, com método do cotovelo, silhouette e comparação com os gêneros.

```bash
cd ml
python -m Scripts.ExecutarMineracao
```

Resultado em 14/11/2026 (teste com 11.961 livros):

| Modelo | Acurácia | F1 macro |
|---|---:|---:|
| Classe majoritária (referência) | 0,291 | 0,023 |
| Naive Bayes | 0,591 | 0,371 |
| Naive Bayes + seleção χ² | 0,642 | 0,466 |
| KNN + χ² (k = 5, distância euclidiana) | 0,378 | 0,173 |
| **KNN com cosseno (k = 25, voto ponderado)** | **0,728** | **0,629** |

O mesmo KNN sai de 0,173 para 0,629 de F1 macro só trocando a distância euclidiana pelo
cosseno, a mesma medida que o recomendador usa.

KMeans com k = 20: silhouette 0,045; contra os gêneros, pureza 0,392 e NMI 0,257. Os grupos
encontrados incluem culinária (91% `Cooking`), policial (84% `Fiction`) e religião
(72% `Religion`). Matriz de confusão e curvas de k em [`docs/mineracao/`](docs/mineracao/).
