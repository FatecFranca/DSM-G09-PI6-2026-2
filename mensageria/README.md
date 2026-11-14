# Mensageria e nuvem

Duas partes do NextRead que rodam fora da API: a **fila de mensagens** (Azure Service Bus + o
consumidor em Python desta pasta) e a **implantação em nuvem** (Render e os arquivos de contêiner em
`cloud/`).

## Mensageria com Azure Service Bus

A API e o consumidor são dois sistemas separados, em linguagens diferentes, que só conversam por uma
fila:

```
web/mobile ──HTTP──► API C# ──envia──► [Azure Service Bus: fila nextread-recomendacoes]
                                                   │
                       mensageria/ (Python) ◄──recebe──┘ ──grava──► PostgreSQL (interacoes)
```

- **Quem publica:** a API, depois que a ação deu certo no banco: `salvou` e `removeu_salvo` (livros
  salvos) e `visualizacao` (detalhe do livro, só com usuário logado). A resposta não espera o
  processamento. Se o Service Bus estiver fora do ar ou sem configuração, a API só registra no log e
  continua funcionando.
- **Quem consome:** o processo desta pasta. Ele confirma a mensagem quando grava, manda para a
  *dead-letter* quando ela é inválida e devolve para a fila quando o banco está fora.
- **Sem duplicar:** cada mensagem tem um `id_evento`. A coluna única em `interacoes`
  (`database/04_mensageria.sql`) impede gravar a mesma interação duas vezes quando o Service Bus
  reentrega a mensagem.

### Mensagem

```json
{
  "id_evento": "2b0c7c1e-5f3a-4a3e-9d6f-1c0b6e2d9a10",
  "tipo": "salvou",
  "id_usuario": 5,
  "id_livro": 123,
  "data": "2026-11-14T12:30:00+00:00"
}
```

`tipo` é `visualizacao`, `salvou` ou `removeu_salvo`. O `MessageId` da mensagem é o `id_evento`.

### O que acontece com cada mensagem

A fila trabalha em modo *peek-lock*: a mensagem só sai dela quando o consumidor confirma.

| Situação | Ação | Por quê |
|---|---|---|
| Gravou (ou já estava gravada) | `complete` | sai da fila |
| JSON inválido, campo faltando, tipo desconhecido, usuário ou livro inexistente | `dead_letter` | reenviar nunca daria certo; fica na fila de mensagens mortas para análise |
| Banco fora do ar ou erro inesperado | `abandon` | volta para a fila e é reentregue. O consumidor espera 5, 10, 30 e depois 60 s entre as tentativas, para uma queda do banco não esgotar as 10 entregas (depois delas o próprio Service Bus manda para a dead-letter) |
| Corpo que não é texto UTF-8 | `dead_letter` | não dá para ler |

Se confirmar a mensagem falhar (por exemplo, lock expirado), o consumidor só registra no log e segue:
a mensagem volta para a fila e o `INSERT ... ON CONFLICT (id_evento) DO NOTHING` evita gravá-la duas
vezes. O Service Bus entrega cada mensagem *pelo menos uma vez*, e é esse `ON CONFLICT` que torna o
consumidor idempotente.

### Configurar e rodar

1. **Banco:** rodar `database/04_mensageria.sql` (local **e** produção; pode rodar mais de uma vez).
2. **API:** em `src/Livros.Api/appsettings.Development.json`, seção `ServiceBus` com `Conexao`
   (cadeia de conexão da política SAS da fila) e `Fila`. No Render, as variáveis
   `ServiceBus__Conexao` e `ServiceBus__Fila`.
3. **Consumidor:**
   ```bash
   cd mensageria
   python -m venv .venv
   .venv/Scripts/pip install -r requirements-dev.txt
   cp .env.example .env    # preencher SERVICE_BUS_CONEXAO e BANCO_URL
   .venv/Scripts/python -m Consumidor.ConsumirInteracoes
   ```

Se a cadeia de conexão tiver `EntityPath` (política criada na própria fila), ela define a fila e
`SERVICE_BUS_FILA` é ignorado. As cadeias de conexão nunca vão para o repositório.

### Estrutura

| Arquivo | Responsabilidade |
|---|---|
| `Consumidor/InteracoesService.py` | valida a mensagem e decide concluir, mandar para dead-letter ou devolver (sem Azure nem banco) |
| `Consumidor/BancoDados.py` | grava em `interacoes` com psycopg e reconecta se o banco cair |
| `Consumidor/ConsumirInteracoes.py` | laço que recebe da fila e aplica a decisão |
| `Consumidor/Configuracao.py` | lê o `.env` |

### Testes

```bash
cd mensageria && .venv/Scripts/python -m pytest
dotnet test src/Livros.slnx      # publicação na API, com Service Bus simulado
```

Nenhum dos dois precisa de Azure nem de banco.

## Nuvem

### Render (em uso)

| Serviço | Endereço | Observações |
|---|---|---|
| Site | [nextread-frontend.onrender.com](https://nextread-frontend.onrender.com/) | Static Site; configuração em [`../src/README.md`](../src/README.md#publicar-no-render-static-site) |
| API | [dsm-g09-pi6-2026-2.onrender.com](https://dsm-g09-pi6-2026-2.onrender.com/saude) | precisa de `ConnectionStrings__BancoLivros` e, para a fila, `ServiceBus__Conexao` e `ServiceBus__Fila` |

No banco de produção também precisam rodar `database/04_mensageria.sql` e
`database/05_avaliacoes.sql`.

### Google Cloud (planejado, não implantado)

O planejamento da disciplina previa Google Cloud: Cloud Run para a API, Cloud SQL (PostgreSQL) para o
banco, Secret Manager para a senha e Cloud Storage ou Firebase Hosting para o site. Para a
mensageria, o plano era o Pub/Sub; na implementação foi adotado o Azure Service Bus, descrito acima.

O que existe no repositório é o `cloud/Dockerfile` (com `cloud/.dockerignore`). Ele publica a API em
Release e a executa na porta 8080 com um usuário sem privilégios, como o Cloud Run espera:

```bash
docker build -f cloud/Dockerfile -t nextread-api .
docker run -p 8080:8080 -e ConnectionStrings__BancoLivros="Host=...;Database=livros_pi;..." nextread-api
```

`GET /pronto` responde assim que a API sobe, sem consultar o banco; `GET /saude` consulta o banco e a
tabela de similaridade. **Nenhum recurso do Google Cloud foi criado:** não há evidência de implantação
nesse ambiente, e o Cloud SQL é cobrado mesmo sem requisições.
