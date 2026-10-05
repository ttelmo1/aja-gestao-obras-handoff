-- A lista de documentos do contrato passa a ser a que o cliente mandou em
-- 21/09/2026 — dezessete itens, na ordem do processo. Fecha o pedido de
-- 09/09 ("ART, publicação e empenho não existem como tipo") registrado no
-- ponto #18 de docs/pontos-para-reuniao.md.

-- AlterEnum: o mesmo papel, com o nome que o cliente usa. Rename preserva o
-- que já foi anexado; acrescentar deixaria dois nomes para a mesma coisa.
ALTER TYPE "TipoDocumento" RENAME VALUE 'GARANTIA' TO 'APOLICE_SEGURO';
ALTER TYPE "TipoDocumento" RENAME VALUE 'RERRATIFICACAO' TO 'TERMO_ADITIVO';
ALTER TYPE "TipoDocumento" RENAME VALUE 'ACEITE' TO 'RECEBIMENTO_PROVISORIO';

-- AlterEnum: os que não existiam. Só adiciona valor — nenhuma linha é
-- reescrita, e nenhum tipo antigo é removido: documento gravado como
-- "Edital", "Proposta" ou "Atestado / CAT" continua válido e visível, ainda
-- que fora da lista cobrada.
ALTER TYPE "TipoDocumento" ADD VALUE 'TERMO_ADJUDICACAO';
ALTER TYPE "TipoDocumento" ADD VALUE 'TERMO_HOMOLOGACAO';
ALTER TYPE "TipoDocumento" ADD VALUE 'EMPENHO';
ALTER TYPE "TipoDocumento" ADD VALUE 'PUBLICACAO_EXTRATO_CONTRATO';
ALTER TYPE "TipoDocumento" ADD VALUE 'PUBLICACAO_COMISSAO_FISCALIZACAO';
ALTER TYPE "TipoDocumento" ADD VALUE 'ART_RRT';
ALTER TYPE "TipoDocumento" ADD VALUE 'CNO';
ALTER TYPE "TipoDocumento" ADD VALUE 'APOSTILAMENTO';
ALTER TYPE "TipoDocumento" ADD VALUE 'RECEBIMENTO_DEFINITIVO';
ALTER TYPE "TipoDocumento" ADD VALUE 'LICENCA';
