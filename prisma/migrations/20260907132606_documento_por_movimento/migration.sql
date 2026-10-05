-- AlterTable
ALTER TABLE "Documento" ADD COLUMN     "movimentoId" TEXT;

-- CreateIndex
CREATE INDEX "Documento_movimentoId_idx" ON "Documento"("movimentoId");

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_movimentoId_fkey" FOREIGN KEY ("movimentoId") REFERENCES "TramitacaoMovimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
