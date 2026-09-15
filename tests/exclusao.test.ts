import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  bloqueioExclusaoMedicao,
  contarDocumentosPorMedicao,
  ondeDocumentosAtivosDaMedicao,
} from "@/modules/medicoes/exclusao";
import { bloqueioExclusaoObra } from "@/modules/obras/exclusao";

describe("exclusão de medição", () => {
  it("libera medição sem documento ativo, seja qual for a situação", () => {
    assert.equal(bloqueioExclusaoMedicao(0), null);
  });

  it("trava medição com documento ativo", () => {
    assert.match(bloqueioExclusaoMedicao(2) ?? "", /2 documento\(s\)/);
  });

  it("consulta só documento ativo, preso à medição ou à tramitação dela", () => {
    const onde = ondeDocumentosAtivosDaMedicao("m1");
    assert.equal(onde.excluidoEm, null);
    assert.deepEqual(onde.OR, [
      { medicaoId: "m1" },
      { movimento: { medicaoId: "m1" } },
    ]);
  });

  it("conta o documento da tramitação para a medição do movimento", () => {
    const contagem = contarDocumentosPorMedicao([
      { medicaoId: "m1", movimento: null },
      { medicaoId: null, movimento: { medicaoId: "m1" } },
      // Movimento de etapa, sem medição: não pesa sobre nenhuma.
      { medicaoId: null, movimento: { medicaoId: null } },
      { medicaoId: "m2", movimento: null },
    ]);
    assert.equal(contagem.get("m1"), 2);
    assert.equal(contagem.get("m2"), 1);
    assert.equal(contagem.size, 2);
  });
});

describe("exclusão de obra", () => {
  it("libera obra sem documento ativo, mesmo com medições", () => {
    assert.equal(bloqueioExclusaoObra(0), null);
  });

  it("trava obra com documento ativo e aponta a aba Documentos", () => {
    assert.match(bloqueioExclusaoObra(1) ?? "", /aba Documentos/);
  });
});
