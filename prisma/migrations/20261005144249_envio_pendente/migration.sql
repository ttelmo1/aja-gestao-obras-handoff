-- CreateTable
CREATE TABLE "EnvioPendente" (
    "id" TEXT NOT NULL,
    "caminhoRelativo" TEXT NOT NULL,
    "nomeArmazenado" TEXT NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanhoBytes" BIGINT NOT NULL,
    "tipo" "TipoDocumento" NOT NULL,
    "descricao" TEXT,
    "obraId" TEXT NOT NULL,
    "medicaoId" TEXT,
    "etapaObraId" TEXT,
    "movimentoId" TEXT,
    "rerratificacaoId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "recebidoEm" TIMESTAMP(3),
    "hashSha256" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnvioPendente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnvioPendente_caminhoRelativo_key" ON "EnvioPendente"("caminhoRelativo");

-- CreateIndex
CREATE INDEX "EnvioPendente_expiraEm_idx" ON "EnvioPendente"("expiraEm");
