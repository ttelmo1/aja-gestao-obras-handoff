-- Suspensão do prazo contratual (pedido do cliente em 24/09/2026): enquanto a
-- obra está suspensa, prazo e ciclo de medição param e voltam a contar na
-- data final. Sem backfill — obras que tiveram o término corrigido à mão por
-- causa de suspensão precisam ser revisadas uma a uma (ponto #26).
-- CreateTable
CREATE TABLE "SuspensaoPrazo" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuspensaoPrazo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SuspensaoPrazo_obraId_dataInicio_idx" ON "SuspensaoPrazo"("obraId", "dataInicio");

-- AddForeignKey
ALTER TABLE "SuspensaoPrazo" ADD CONSTRAINT "SuspensaoPrazo_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A data final, quando existe, vem depois do início. A tela já recusa; a
-- trava no banco protege de escrita por outro caminho.
ALTER TABLE "SuspensaoPrazo" ADD CONSTRAINT "SuspensaoPrazo_fim_depois_do_inicio"
  CHECK ("dataFim" IS NULL OR "dataFim" > "dataInicio");
