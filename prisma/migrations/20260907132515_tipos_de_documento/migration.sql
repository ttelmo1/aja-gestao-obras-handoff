-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoDocumento" ADD VALUE 'PROTOCOLO';
ALTER TYPE "TipoDocumento" ADD VALUE 'ISS';
ALTER TYPE "TipoDocumento" ADD VALUE 'DESPACHO';
ALTER TYPE "TipoDocumento" ADD VALUE 'PARECER';
ALTER TYPE "TipoDocumento" ADD VALUE 'AUTORIZACAO';
ALTER TYPE "TipoDocumento" ADD VALUE 'EXIGENCIA';
ALTER TYPE "TipoDocumento" ADD VALUE 'COMPROVANTE';
