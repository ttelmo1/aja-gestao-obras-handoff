-- CreateTable
CREATE TABLE "FreioLogin" (
    "chave" TEXT NOT NULL,
    "tentativas" INTEGER NOT NULL,
    "bloqueadoAte" TIMESTAMP(3) NOT NULL,
    "visto" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreioLogin_pkey" PRIMARY KEY ("chave")
);
