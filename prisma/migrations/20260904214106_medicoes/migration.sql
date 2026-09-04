-- CreateEnum
CREATE TYPE "PeriodicidadeMedicao" AS ENUM ('MENSAL', 'QUINZENAL', 'SEMANAL', 'PERSONALIZADA');

-- AlterTable
ALTER TABLE "Medicao" ADD COLUMN     "dataMedicao" TIMESTAMP(3),
ADD COLUMN     "responsavelId" TEXT;

-- AlterTable
ALTER TABLE "Obra" ADD COLUMN     "intervaloMedicaoDias" INTEGER,
ADD COLUMN     "periodicidadeMedicao" "PeriodicidadeMedicao" NOT NULL DEFAULT 'MENSAL';

-- AddForeignKey
ALTER TABLE "Medicao" ADD CONSTRAINT "Medicao_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Responsavel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
