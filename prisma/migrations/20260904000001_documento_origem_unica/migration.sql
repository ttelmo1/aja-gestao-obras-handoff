-- Um documento tem exatamente UMA origem (obra, medição, etapa ou
-- rerratificação). O Prisma Schema não expressa CHECK constraint, então a
-- regra vive aqui — no banco, onde nenhum caminho de código escapa dela.
ALTER TABLE "Documento"
  ADD CONSTRAINT "Documento_origem_unica_check"
  CHECK (
    (
      ("obraId" IS NOT NULL)::int
      + ("medicaoId" IS NOT NULL)::int
      + ("etapaObraId" IS NOT NULL)::int
      + ("rerratificacaoId" IS NOT NULL)::int
    ) = 1
  );

-- A trilha de auditoria é imutável (requisitos.md 1.8): bloqueia UPDATE e
-- DELETE na tabela, inclusive por engano de código ou acesso direto ao banco.
CREATE OR REPLACE FUNCTION "auditoria_somente_insercao"()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'A trilha de auditoria e imutavel: % nao e permitido.', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "auditoria_bloqueia_update_delete"
  BEFORE UPDATE OR DELETE ON "Auditoria"
  FOR EACH ROW EXECUTE FUNCTION "auditoria_somente_insercao"();
