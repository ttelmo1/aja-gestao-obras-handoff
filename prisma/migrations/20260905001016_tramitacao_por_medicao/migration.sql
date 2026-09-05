-- AlterTable
ALTER TABLE "TramitacaoMovimento" ADD COLUMN     "medicaoId" TEXT;

-- CreateIndex
CREATE INDEX "TramitacaoMovimento_medicaoId_dataEntrada_idx" ON "TramitacaoMovimento"("medicaoId", "dataEntrada");

-- AddForeignKey
ALTER TABLE "TramitacaoMovimento" ADD CONSTRAINT "TramitacaoMovimento_medicaoId_fkey" FOREIGN KEY ("medicaoId") REFERENCES "Medicao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
