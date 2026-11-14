-- id do evento vindo da fila do service bus; o indice unico impede gravar a mesma
-- mensagem duas vezes quando ela e reentregue. pode rodar mais de uma vez.
BEGIN;

ALTER TABLE interacoes ADD COLUMN IF NOT EXISTS id_evento UUID;

CREATE UNIQUE INDEX IF NOT EXISTS uq_interacoes_id_evento ON interacoes (id_evento);

COMMIT;
