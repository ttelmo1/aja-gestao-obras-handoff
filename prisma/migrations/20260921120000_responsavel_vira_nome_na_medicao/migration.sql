-- O cadastro de responsáveis sai do sistema (Fernanda, 21/09/2026): "retirar
-- o cadastro de responsáveis" e, na medição, "pode deixar só pra colocar o
-- nome do responsável pela medição mesmo".
--
-- A ordem importa: o nome é copiado da tabela antes de ela morrer, senão o
-- que já foi lançado perde o responsável. A coluna nova é texto livre — não
-- há mais para onde apontar.

-- AlterTable
ALTER TABLE "Medicao" ADD COLUMN "responsavelNome" TEXT;

UPDATE "Medicao" m
SET "responsavelNome" = r."nome"
FROM "Responsavel" r
WHERE m."responsavelId" = r."id";

-- DropForeignKey / DropColumn
ALTER TABLE "Medicao" DROP CONSTRAINT IF EXISTS "Medicao_responsavelId_fkey";
ALTER TABLE "Medicao" DROP COLUMN "responsavelId";

-- DropTable
DROP TABLE "Responsavel";
