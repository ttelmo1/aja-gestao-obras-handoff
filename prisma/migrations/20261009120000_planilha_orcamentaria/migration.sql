-- AlterEnum
-- Planilha orçamentária entra na lista de documentos do contrato, como
-- documento obrigatório — pedido do Junior pela Fernanda em 09/10/2026.
--
-- Só adiciona valor ao enum: o tipo genérico PLANILHA continua existindo para
-- a rerratificação, e nenhuma linha é reescrita.
ALTER TYPE "TipoDocumento" ADD VALUE 'PLANILHA_ORCAMENTARIA' AFTER 'CONTRATO';
