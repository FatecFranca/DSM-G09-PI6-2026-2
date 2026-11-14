# Consumidor de mensagens — Azure Service Bus

Processo Python separado da API e do pipeline de ML. Ele lê a fila `nextread-recomendacoes` do
Azure Service Bus e grava cada interação do usuário (visualizou, salvou ou removeu um livro) na
tabela `interacoes`.

```
API C# ──envia──► [Service Bus: nextread-recomendacoes] ──recebe──► Consumidor ──grava──► interacoes
```

## Mensagem

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

## O que acontece com cada mensagem

A fila trabalha em modo *peek-lock*: a mensagem só sai dela quando o consumidor confirma.

| Situação | Ação | Por quê |
|---|---|---|
| Gravou (ou já estava gravada) | `complete` | sai da fila |
| JSON inválido, campo faltando, tipo desconhecido, usuário ou livro inexistente | `dead_letter` | reenviar nunca daria certo; fica na fila de mensagens mortas para análise |
| Banco fora do ar ou erro inesperado | `abandon` | volta para a fila e é reentregue. O consumidor espera 5, 10, 30 e depois 60 s entre as tentativas, para uma queda do banco não esgotar as 10 entregas (depois delas o próprio Service Bus manda para a dead-letter) |
| Corpo que não é texto UTF-8 | `dead_letter` | não dá para ler |

Se confirmar a mensagem falhar (ex.: lock expirado), o consumidor só registra no log e segue: a
mensagem volta para a fila e o `ON CONFLICT` evita gravá-la duas vezes.

**Idempotência:** o Service Bus entrega cada mensagem *pelo menos uma vez*. O `INSERT` usa
`ON CONFLICT (id_evento) DO NOTHING` (coluna única criada por `database/04_mensageria.sql`), então
uma reentrega não duplica a interação.

## Configurar e rodar

```bash
cd mensageria
python -m venv .venv
.venv/Scripts/pip install -r requirements-dev.txt
cp .env.example .env    # preencher SERVICE_BUS_CONEXAO e BANCO_URL
.venv/Scripts/python -m Consumidor.ConsumirInteracoes
```

Se a cadeia de conexão tiver `EntityPath` (política criada na própria fila), ela define a fila e
`SERVICE_BUS_FILA` é ignorado. O `.env` não é versionado.

## Estrutura

| Arquivo | Responsabilidade |
|---|---|
| `Consumidor/InteracoesService.py` | valida a mensagem e decide concluir, mandar para dead-letter ou devolver (sem Azure nem banco) |
| `Consumidor/BancoDados.py` | grava em `interacoes` com psycopg e reconecta se o banco cair |
| `Consumidor/ConsumirInteracoes.py` | laço que recebe da fila e aplica a decisão |
| `Consumidor/Configuracao.py` | lê o `.env` |

## Testes

```bash
.venv/Scripts/python -m pytest
```

Não precisam de Azure nem de banco.
