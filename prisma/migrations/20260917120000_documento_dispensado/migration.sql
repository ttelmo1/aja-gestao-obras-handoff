-- Lista de conferência de documentos: o que a obra (ou a medição) não precisa
-- entregar.
--
-- Pedido do Junior em 17/09/2026, pela Fernanda: a aba Documentos passa a
-- listar os tipos esperados e marcar em vermelho o que falta. Sem dispensa,
-- todo contrato sem garantia — ou sem ISS, ou sem rerratificação — ficaria com
-- linha vermelha permanente, e o vermelho deixaria de querer dizer alguma
-- coisa. Na tela, o tipo dispensado fica cinza e vai para o fim da lista.
--
-- A unicidade usa DOIS índices parciais, e não um UNIQUE comum: `medicaoId` é
-- nulo na dispensa do contrato, e no Postgres dois NULL nunca são iguais — um
-- UNIQUE ("obraId","medicaoId","tipo") aceitaria a mesma dispensa de contrato
-- repetida à vontade.
CREATE TABLE "DocumentoDispensado" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "medicaoId" TEXT,
    "tipo" "TipoDocumento" NOT NULL,
    "motivo" TEXT,
    "marcadoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoDispensado_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentoDispensado_obraId_idx" ON "DocumentoDispensado"("obraId");
CREATE INDEX "DocumentoDispensado_medicaoId_idx" ON "DocumentoDispensado"("medicaoId");

CREATE UNIQUE INDEX "DocumentoDispensado_obra_tipo_key"
    ON "DocumentoDispensado"("obraId", "tipo")
    WHERE "medicaoId" IS NULL;

CREATE UNIQUE INDEX "DocumentoDispensado_medicao_tipo_key"
    ON "DocumentoDispensado"("medicaoId", "tipo")
    WHERE "medicaoId" IS NOT NULL;

ALTER TABLE "DocumentoDispensado" ADD CONSTRAINT "DocumentoDispensado_obraId_fkey"
    FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentoDispensado" ADD CONSTRAINT "DocumentoDispensado_medicaoId_fkey"
    FOREIGN KEY ("medicaoId") REFERENCES "Medicao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentoDispensado" ADD CONSTRAINT "DocumentoDispensado_marcadoPorId_fkey"
    FOREIGN KEY ("marcadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
