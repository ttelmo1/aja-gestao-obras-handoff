-- O prazo adicional aprovado numa rerratificação passa a prorrogar a obra.
-- Até aqui ele era gravado e mostrado só na aba Rerratificações: os dias
-- restantes e o farol continuavam contando pelo término do contrato
-- assinado, e obra prorrogada aparecia como vencida (relato do cliente em
-- 22/09/2026).
--
-- A coluna é cache, igual a `valorAditivado`: a regra mora em
-- modules/rerratificacoes/calculos.ts e o término que vale hoje é derivado
-- de `dataPrevistaTermino` + `prazoAditivadoDias`. `dataPrevistaTermino`
-- continua sendo a do contrato e não é reescrita — pedido do cliente: "mas
-- não alterar o contrato".

-- AlterTable
ALTER TABLE "Obra" ADD COLUMN "prazoAditivadoDias" INTEGER NOT NULL DEFAULT 0;

-- Backfill: as obras que já tinham rerratificação aprovada antes desta
-- migration nunca passariam pelo recálculo até alguém mexer nelas de novo.
-- Mesmo recorte da regra em código — só APROVADA conta.
UPDATE "Obra" o
SET "prazoAditivadoDias" = COALESCE(
  (
    SELECT SUM(r."prazoAdicionalDias")
    FROM "Rerratificacao" r
    WHERE r."obraId" = o."id"
      AND r."status" = 'APROVADA'
      AND r."prazoAdicionalDias" IS NOT NULL
  ),
  0
);
