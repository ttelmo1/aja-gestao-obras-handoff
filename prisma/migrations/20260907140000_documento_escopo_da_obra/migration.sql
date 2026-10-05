-- A regra de vínculo do documento mudou na etapa 7.
--
-- A da etapa 0 exigia EXATAMENTE UM entre obra, medição, etapa e
-- rerratificação. Na prática isso não descreve o sistema: a central de
-- documentos precisa listar todo o acervo de uma obra numa consulta só, e
-- ela só consegue se `obraId` estiver sempre preenchido — é o escopo do
-- arquivo, não um vínculo concorrente com os outros. Sem isso, achar os
-- documentos de uma obra exigiria varrer medições, etapas e rerratificações
-- e unir os resultados, e o ON DELETE CASCADE da obra deixaria de alcançá-los.
--
-- A regra nova separa as duas perguntas que o registro responde:
--   * DE QUE OBRA é o arquivo   -> "obraId", sempre preenchido;
--   * SOBRE O QUE ele é         -> no máximo um entre medição e rerratificação;
--   * ONDE ELE ENTROU no fluxo  -> etapa e/ou movimento, opcionais e
--     independentes (o mockup mostra "Medição 05 / Controladoria": as duas
--     coisas ao mesmo tempo).
ALTER TABLE "Documento"
  DROP CONSTRAINT IF EXISTS "Documento_origem_unica_check";

ALTER TABLE "Documento"
  ADD CONSTRAINT "Documento_escopo_da_obra_check"
  CHECK ("obraId" IS NOT NULL);

ALTER TABLE "Documento"
  ADD CONSTRAINT "Documento_assunto_unico_check"
  CHECK (
    (
      ("medicaoId" IS NOT NULL)::int
      + ("rerratificacaoId" IS NOT NULL)::int
    ) <= 1
  );

-- Movimento pertence a uma etapa; um documento preso ao movimento sem dizer
-- a etapa esconderia metade da informação na central.
ALTER TABLE "Documento"
  ADD CONSTRAINT "Documento_movimento_exige_etapa_check"
  CHECK ("movimentoId" IS NULL OR "etapaObraId" IS NOT NULL);
