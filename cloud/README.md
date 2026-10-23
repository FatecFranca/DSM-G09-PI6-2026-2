# Etapa 3 — Preparação do ambiente Google Cloud (Sprint 2)

**Situação:** arquivos de deploy preparados; **nenhum recurso de nuvem foi criado por estes arquivos**. A equipe precisa executar os comandos em uma conta/projeto GCP próprio, com faturamento habilitado. Podem ocorrer cobranças (Cloud SQL geralmente não está no nível gratuito).

## Arquitetura escolhida para implantação inicial

- API ASP.NET Core 10 em **Cloud Run** (contêiner via Cloud Build / Artifact Registry).
- **Cloud SQL for PostgreSQL** para o banco `livros_pi`.
- **Secret Manager** para senha do banco.
- Front-end: continua local nesta etapa; hospedagem pode ser feita no Firebase Hosting em uma etapa posterior.
- ML: permanece executado localmente ou em processo separado nesta etapa; **Pub/Sub e Vertex AI não estão implementados ou provisionados**.

O README original sugeria Compute Engine e o PDF de Nuvem mencionava Cloud Run. **Esta etapa adota Cloud Run como a opção de implementação inicial**; o PDF original é histórico/planejamento, não prova de configuração real.

## Pré-requisitos

1. Google Cloud CLI (`gcloud`) autenticado: `gcloud auth login`.
2. Projeto GCP criado, com billing ativo e APIs habilitadas.
3. Instância **Cloud SQL PostgreSQL** criada na região pretendida, com banco `livros_pi` e usuário de aplicação próprio.
4. Schema e dados de teste aplicados à instância usando `database/README.md`. **Cloud Run não cria nem popula as tabelas automaticamente.**
5. Segredo do Secret Manager criado com **somente a senha** do usuário do banco; conceder ao service account do Cloud Run `roles/secretmanager.secretAccessor`.
6. Permissões para Cloud Run, Cloud Build, Artifact Registry e `roles/cloudsql.client` para o service account do Cloud Run; permissões para rodar builds.

**Dica:** instância Cloud SQL é cobrada mesmo sem requisições. Desligue/exclua recursos de teste quando não forem mais necessários.

## Configuração das variáveis e implantação (Bash / Cloud Shell)

Execute na raiz do repositório, ajustando os valores reais:

```bash
export PROJECT_ID="seu-projeto-gcp"
export REGION="southamerica-east1"
export CLOUD_SQL_INSTANCE="seu-projeto-gcp:southamerica-east1:sua-instancia"
export DB_NAME="livros_pi"
export DB_USER="nextread_app"
export DB_PASSWORD_SECRET="nextread-db-password"
bash cloud/deploy.sh
```

O script publica a imagem e cria/atualiza o serviço Cloud Run **privado** (`--no-allow-unauthenticated`). Para acesso público pela interface, é necessário decidir autenticação, políticas de acesso e CORS antes de liberar o serviço.

### Verificação

```bash
gcloud run services describe nextread-api --region="$REGION" --format='value(status.url)'
gcloud run services logs read nextread-api --region="$REGION" --limit=30
```

`GET /pronto` indica que a API iniciou, **não** verifica o PostgreSQL. `GET /saude` consulta o banco e o número de pares de similaridade; requer credenciais e esquema correto. Para serviço privado, obtenha um token IAM com `gcloud auth print-identity-token` e consulte a URL com cabeçalho `Authorization: Bearer TOKEN` (a identidade precisa de permissão de invocação).

Para desenvolvimento local, copie `src/Livros.Api/appsettings.Development.json.example` para `appsettings.Development.json`, troque `SUA_SENHA_LOCAL` e **não versione** a cópia. Alternativamente, configure `ConnectionStrings__BancoLivros` no ambiente.

## Evidências para entregar na Sprint 2

- [ ] Print do projeto GCP e região, ocultando IDs sensíveis se necessário.
- [ ] Print do serviço Cloud Run com status ativo e URL.
- [ ] Print da instância Cloud SQL e banco criado, sem revelar segredos.
- [ ] Print do resultado autenticado de `/pronto` e `/saude` (ou de erro do banco e correção).
- [ ] Print dos logs da aplicação e breve descrição do processo de implantação.
- [ ] Registrar integrantes responsáveis e data real da implantação.

**Atenção:** nenhum print foi inventado nem foi afirmado que a implantação ocorreu. O script depende de permissão real no projeto e pode exigir ajustes de IAM e conectividade.
