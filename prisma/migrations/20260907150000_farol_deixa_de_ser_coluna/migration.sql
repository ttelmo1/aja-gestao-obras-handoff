-- O farol deixa de ser coluna.
--
-- A coluna `farol` e o carimbo `farolCalculadoEm` existiam desde a etapa 0 como
-- cache, mas nunca chegaram a ser escritos por lugar nenhum: o painel, a tela
-- da obra e os relatórios sempre calcularam pelo motor
-- (src/modules/farol/regras.ts). Manter a coluna era guardar uma luz que
-- envelhece sozinha — obra fica amarela pela passagem do tempo, sem ninguém
-- salvar nada — e o índice composto com ela nunca serviu a consulta alguma,
-- porque o filtro por farol é aplicado depois do cálculo, em memória.
--
-- O enum `Farol` continua existindo: é o tipo do resultado do cálculo.
DROP INDEX "Obra_status_farol_idx";
CREATE INDEX "Obra_status_idx" ON "Obra"("status");
ALTER TABLE "Obra" DROP COLUMN "farol", DROP COLUMN "farolCalculadoEm";
