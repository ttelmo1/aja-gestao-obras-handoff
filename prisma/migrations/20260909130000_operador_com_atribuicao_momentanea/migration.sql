-- O responsável técnico da obra vira operador com atribuição momentânea.
--
-- Decidido na apresentação à diretoria em 09/09/2026: não existe responsável
-- fixo por obra. São 15 a 20 contratos para três pessoas no setor, quem está
-- disponível trata, e às vezes duas pessoas tratam a mesma obra — qualquer
-- desenho que amarre uma pessoa a um contrato está errado. A nomenclatura
-- também atrapalhava: "responsável técnico" fazia pensar no engenheiro da
-- obra, não em quem cuida do processo.
--
-- A atribuição sai do cadastro do contrato e passa a ser feita pelo próprio
-- operador na aba Resumo, com observação em texto livre. Ao liberar, o nome
-- permanece como o último que mexeu — é registro, não fila de tarefas.
--
-- `Obra.responsavelId` é REMOVIDA: o conceito deixou de existir, e o novo
-- campo aponta para `Usuario` (quem assume é quem está logado), não para
-- `Responsavel`. A base do cliente ainda é de demonstração e não recebeu dado
-- real, então não há o que preservar. `Medicao.responsavelId` continua intacta
-- — ali o "Responsável AJA" é de quem assinou aquele boletim, e foi conferido
-- e aceito na mesma reunião.
DROP INDEX "Obra_responsavelId_idx";
ALTER TABLE "Obra" DROP CONSTRAINT "Obra_responsavelId_fkey";
ALTER TABLE "Obra" DROP COLUMN "responsavelId";

ALTER TABLE "Obra"
  ADD COLUMN "operadorId" TEXT,
  ADD COLUMN "operadorAssumidoEm" TIMESTAMP(3),
  ADD COLUMN "operadorLiberadoEm" TIMESTAMP(3),
  ADD COLUMN "operadorObservacao" TEXT;

CREATE INDEX "Obra_operadorId_idx" ON "Obra"("operadorId");
ALTER TABLE "Obra" ADD CONSTRAINT "Obra_operadorId_fkey"
  FOREIGN KEY ("operadorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
