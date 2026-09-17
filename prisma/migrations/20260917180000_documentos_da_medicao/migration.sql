-- AlterEnum
-- Os documentos necessários de uma medição, ditos pelo cliente em 17/09/2026:
-- medição, memória de cálculo, cronograma, relatório fotográfico, diário de
-- obra e nota fiscal. Quatro não existiam como tipo.
--
-- Só adiciona valor ao enum: nada é renomeado nem removido, então documento já
-- gravado como PLANILHA ou FOTO continua válido e nenhuma linha é reescrita.
ALTER TYPE "TipoDocumento" ADD VALUE 'MEMORIA_CALCULO';
ALTER TYPE "TipoDocumento" ADD VALUE 'CRONOGRAMA';
ALTER TYPE "TipoDocumento" ADD VALUE 'RELATORIO_FOTOGRAFICO';
ALTER TYPE "TipoDocumento" ADD VALUE 'DIARIO_OBRA';
