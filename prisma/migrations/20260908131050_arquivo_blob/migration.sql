-- CreateTable
CREATE TABLE "ArquivoBlob" (
    "caminhoRelativo" TEXT NOT NULL,
    "conteudo" BYTEA NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArquivoBlob_pkey" PRIMARY KEY ("caminhoRelativo")
);
