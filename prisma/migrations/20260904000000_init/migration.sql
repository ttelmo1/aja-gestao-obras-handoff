-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('ADMINISTRADOR', 'GESTOR', 'OPERACIONAL', 'VISUALIZADOR');

-- CreateEnum
CREATE TYPE "Esfera" AS ENUM ('MUNICIPAL', 'ESTADUAL', 'FEDERAL');

-- CreateEnum
CREATE TYPE "StatusObra" AS ENUM ('PLANEJAMENTO', 'EM_ANDAMENTO', 'PARALISADA', 'FINALIZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "Farol" AS ENUM ('VERDE', 'AMARELO', 'VERMELHO', 'CINZA');

-- CreateEnum
CREATE TYPE "StatusMedicao" AS ENUM ('RASCUNHO', 'PROTOCOLADA', 'APROVADA', 'PAGA', 'REJEITADA');

-- CreateEnum
CREATE TYPE "TipoEtapa" AS ENUM ('BUSCA_LICITACAO', 'HABILITACAO_HOMOLOGACAO', 'ASSINATURA_CONTRATO', 'GARANTIA', 'ORDEM_INICIO', 'EXECUCAO_OBRA', 'MEDICOES', 'RERRATIFICACAO', 'FINALIZACAO', 'ACEITE', 'ATESTADO');

-- CreateEnum
CREATE TYPE "StatusEtapa" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'NAO_SE_APLICA');

-- CreateEnum
CREATE TYPE "StatusRerratificacao" AS ENUM ('EM_ELABORACAO', 'PROTOCOLADA', 'APROVADA', 'REJEITADA');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('EDITAL', 'PROPOSTA', 'CONTRATO', 'GARANTIA', 'ORDEM_INICIO', 'MEDICAO', 'NOTA_FISCAL', 'RERRATIFICACAO', 'ACEITE', 'ATESTADO', 'FOTO', 'PLANILHA', 'OUTRO');

-- CreateEnum
CREATE TYPE "AcaoAuditoria" AS ENUM ('CRIAR', 'ATUALIZAR', 'EXCLUIR', 'LOGIN', 'LOGOUT', 'UPLOAD', 'DOWNLOAD', 'EXPORTAR', 'TRAMITAR');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL DEFAULT 'VISUALIZADOR',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoLogin" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenSenha" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenSenha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Responsavel" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cargo" TEXT,
    "registro" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Responsavel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contratante" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "esfera" "Esfera",
    "contato" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contratante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setor" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sigla" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Setor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Obra" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "objeto" TEXT NOT NULL,
    "numeroContrato" TEXT NOT NULL,
    "numeroProcesso" TEXT,
    "contratanteId" TEXT NOT NULL,
    "responsavelId" TEXT,
    "valorContratado" DECIMAL(15,2) NOT NULL,
    "valorAditivado" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "dataAssinatura" TIMESTAMP(3),
    "dataOrdemInicio" TIMESTAMP(3),
    "prazoDias" INTEGER,
    "dataPrevistaTermino" TIMESTAMP(3),
    "dataTerminoReal" TIMESTAMP(3),
    "status" "StatusObra" NOT NULL DEFAULT 'PLANEJAMENTO',
    "farol" "Farol" NOT NULL DEFAULT 'CINZA',
    "farolCalculadoEm" TIMESTAMP(3),
    "observacoes" TEXT,
    "criadoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Obra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicao" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "competencia" TIMESTAMP(3) NOT NULL,
    "periodoInicio" TIMESTAMP(3),
    "periodoFim" TIMESTAMP(3),
    "valorMedido" DECIMAL(15,2) NOT NULL,
    "percentualExecutado" DECIMAL(5,2) NOT NULL,
    "protocolo" TEXT,
    "dataProtocolo" TIMESTAMP(3),
    "notaFiscalNumero" TEXT,
    "notaFiscalData" TIMESTAMP(3),
    "notaFiscalValor" DECIMAL(15,2),
    "issAliquota" DECIMAL(5,2),
    "issValor" DECIMAL(15,2),
    "status" "StatusMedicao" NOT NULL DEFAULT 'RASCUNHO',
    "dataPagamento" TIMESTAMP(3),
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtapaObra" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "tipo" "TipoEtapa" NOT NULL,
    "ordem" INTEGER NOT NULL,
    "status" "StatusEtapa" NOT NULL DEFAULT 'PENDENTE',
    "dataInicio" TIMESTAMP(3),
    "dataConclusao" TIMESTAMP(3),
    "diasPermanencia" INTEGER,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EtapaObra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TramitacaoMovimento" (
    "id" TEXT NOT NULL,
    "etapaObraId" TEXT NOT NULL,
    "setorOrigemId" TEXT,
    "setorDestinoId" TEXT NOT NULL,
    "dataEntrada" TIMESTAMP(3) NOT NULL,
    "dataSaida" TIMESTAMP(3),
    "diasPermanencia" INTEGER,
    "registradoPorId" TEXT,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TramitacaoMovimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rerratificacao" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "data" TIMESTAMP(3),
    "protocolo" TEXT,
    "percentualAlcancado" DECIMAL(5,2) NOT NULL,
    "valorImpactado" DECIMAL(15,2) NOT NULL,
    "prazoAdicionalDias" INTEGER,
    "status" "StatusRerratificacao" NOT NULL DEFAULT 'EM_ELABORACAO',
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rerratificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "nomeArmazenado" TEXT NOT NULL,
    "caminhoRelativo" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extensao" TEXT NOT NULL,
    "tamanhoBytes" BIGINT NOT NULL,
    "hashSha256" TEXT,
    "tipo" "TipoDocumento" NOT NULL DEFAULT 'OUTRO',
    "descricao" TEXT,
    "obraId" TEXT,
    "medicaoId" TEXT,
    "etapaObraId" TEXT,
    "rerratificacaoId" TEXT,
    "enviadoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "excluidoEm" TIMESTAMP(3),

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "usuarioNome" TEXT NOT NULL,
    "acao" "AcaoAuditoria" NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "obraId" TEXT,
    "descricao" TEXT NOT NULL,
    "dadosAntes" JSONB,
    "dadosDepois" JSONB,
    "ip" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_ativo_idx" ON "Usuario"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "TokenSenha_tokenHash_key" ON "TokenSenha"("tokenHash");

-- CreateIndex
CREATE INDEX "TokenSenha_usuarioId_idx" ON "TokenSenha"("usuarioId");

-- CreateIndex
CREATE INDEX "Responsavel_ativo_idx" ON "Responsavel"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "Contratante_cnpj_key" ON "Contratante"("cnpj");

-- CreateIndex
CREATE INDEX "Contratante_ativo_idx" ON "Contratante"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "Setor_nome_key" ON "Setor"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Obra_codigo_key" ON "Obra"("codigo");

-- CreateIndex
CREATE INDEX "Obra_status_farol_idx" ON "Obra"("status", "farol");

-- CreateIndex
CREATE INDEX "Obra_contratanteId_idx" ON "Obra"("contratanteId");

-- CreateIndex
CREATE INDEX "Obra_responsavelId_idx" ON "Obra"("responsavelId");

-- CreateIndex
CREATE INDEX "Obra_dataPrevistaTermino_idx" ON "Obra"("dataPrevistaTermino");

-- CreateIndex
CREATE INDEX "Medicao_obraId_competencia_idx" ON "Medicao"("obraId", "competencia");

-- CreateIndex
CREATE INDEX "Medicao_status_idx" ON "Medicao"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Medicao_obraId_numero_key" ON "Medicao"("obraId", "numero");

-- CreateIndex
CREATE INDEX "EtapaObra_obraId_ordem_idx" ON "EtapaObra"("obraId", "ordem");

-- CreateIndex
CREATE INDEX "EtapaObra_status_idx" ON "EtapaObra"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EtapaObra_obraId_tipo_key" ON "EtapaObra"("obraId", "tipo");

-- CreateIndex
CREATE INDEX "TramitacaoMovimento_etapaObraId_dataEntrada_idx" ON "TramitacaoMovimento"("etapaObraId", "dataEntrada");

-- CreateIndex
CREATE INDEX "TramitacaoMovimento_dataSaida_idx" ON "TramitacaoMovimento"("dataSaida");

-- CreateIndex
CREATE INDEX "TramitacaoMovimento_setorDestinoId_idx" ON "TramitacaoMovimento"("setorDestinoId");

-- CreateIndex
CREATE INDEX "Rerratificacao_status_idx" ON "Rerratificacao"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Rerratificacao_obraId_numero_key" ON "Rerratificacao"("obraId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Documento_nomeArmazenado_key" ON "Documento"("nomeArmazenado");

-- CreateIndex
CREATE INDEX "Documento_tipo_idx" ON "Documento"("tipo");

-- CreateIndex
CREATE INDEX "Documento_obraId_idx" ON "Documento"("obraId");

-- CreateIndex
CREATE INDEX "Documento_medicaoId_idx" ON "Documento"("medicaoId");

-- CreateIndex
CREATE INDEX "Documento_etapaObraId_idx" ON "Documento"("etapaObraId");

-- CreateIndex
CREATE INDEX "Documento_rerratificacaoId_idx" ON "Documento"("rerratificacaoId");

-- CreateIndex
CREATE INDEX "Documento_nomeOriginal_idx" ON "Documento"("nomeOriginal");

-- CreateIndex
CREATE INDEX "Documento_excluidoEm_idx" ON "Documento"("excluidoEm");

-- CreateIndex
CREATE INDEX "Documento_hashSha256_idx" ON "Documento"("hashSha256");

-- CreateIndex
CREATE INDEX "Auditoria_obraId_criadoEm_idx" ON "Auditoria"("obraId", "criadoEm");

-- CreateIndex
CREATE INDEX "Auditoria_entidade_entidadeId_idx" ON "Auditoria"("entidade", "entidadeId");

-- CreateIndex
CREATE INDEX "Auditoria_criadoEm_idx" ON "Auditoria"("criadoEm");

-- CreateIndex
CREATE INDEX "Auditoria_usuarioId_idx" ON "Auditoria"("usuarioId");

-- AddForeignKey
ALTER TABLE "TokenSenha" ADD CONSTRAINT "TokenSenha_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obra" ADD CONSTRAINT "Obra_contratanteId_fkey" FOREIGN KEY ("contratanteId") REFERENCES "Contratante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obra" ADD CONSTRAINT "Obra_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Responsavel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obra" ADD CONSTRAINT "Obra_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicao" ADD CONSTRAINT "Medicao_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtapaObra" ADD CONSTRAINT "EtapaObra_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TramitacaoMovimento" ADD CONSTRAINT "TramitacaoMovimento_etapaObraId_fkey" FOREIGN KEY ("etapaObraId") REFERENCES "EtapaObra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TramitacaoMovimento" ADD CONSTRAINT "TramitacaoMovimento_setorOrigemId_fkey" FOREIGN KEY ("setorOrigemId") REFERENCES "Setor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TramitacaoMovimento" ADD CONSTRAINT "TramitacaoMovimento_setorDestinoId_fkey" FOREIGN KEY ("setorDestinoId") REFERENCES "Setor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TramitacaoMovimento" ADD CONSTRAINT "TramitacaoMovimento_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rerratificacao" ADD CONSTRAINT "Rerratificacao_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_medicaoId_fkey" FOREIGN KEY ("medicaoId") REFERENCES "Medicao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_etapaObraId_fkey" FOREIGN KEY ("etapaObraId") REFERENCES "EtapaObra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_rerratificacaoId_fkey" FOREIGN KEY ("rerratificacaoId") REFERENCES "Rerratificacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_enviadoPorId_fkey" FOREIGN KEY ("enviadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
