import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { StatusMedicao } from "@/generated/prisma/enums";
import {
  filtrarMedicoes,
  lerFiltrosMedicao,
  pagamentoPendente,
  temFiltroMedicao,
} from "@/modules/medicoes/filtros";

const lista = [
  { numero: 1, status: StatusMedicao.PAGA },
  { numero: 2, status: StatusMedicao.APROVADA },
  { numero: 3, status: StatusMedicao.PROTOCOLADA },
  { numero: 4, status: StatusMedicao.RASCUNHO },
  { numero: 5, status: StatusMedicao.REJEITADA },
];

const numeros = (f: Parameters<typeof filtrarMedicoes>[1]) =>
  filtrarMedicoes(lista, f).map((m) => m.numero);

describe("filtros da aba de medições", () => {
  it("sem filtro, devolve tudo", () => {
    const f = lerFiltrosMedicao({});
    assert.equal(temFiltroMedicao(f), false);
    assert.deepEqual(numeros(f), [1, 2, 3, 4, 5]);
  });

  it("pagamento pendente é toda medição protocolada que não foi paga", () => {
    const f = lerFiltrosMedicao({ pagamento: "pendente" });
    assert.equal(temFiltroMedicao(f), true);
    assert.deepEqual(numeros(f), [2, 3]);
  });

  // 09/10/2026: rascunho não soma com as aprovadas.
  it("rascunho não é pendência de pagamento", () => {
    assert.equal(pagamentoPendente(StatusMedicao.RASCUNHO), false);
  });

  // Rejeitada saiu do ciclo: ninguém espera pagamento dela.
  it("rejeitada não é pendência de pagamento", () => {
    assert.equal(pagamentoPendente(StatusMedicao.REJEITADA), false);
    assert.equal(pagamentoPendente(StatusMedicao.PAGA), false);
    assert.equal(pagamentoPendente(StatusMedicao.APROVADA), true);
  });

  it("filtra por situação específica", () => {
    assert.deepEqual(numeros(lerFiltrosMedicao({ status: "PAGA" })), [1]);
  });

  it("situação inválida na URL vira sem filtro, não erro", () => {
    const f = lerFiltrosMedicao({ status: "QUALQUER" });
    assert.equal(f.status, null);
    assert.deepEqual(numeros(f), [1, 2, 3, 4, 5]);
  });

  it("situação e pendência combinam, sem se contradizer", () => {
    const f = lerFiltrosMedicao({ status: "PAGA", pagamento: "pendente" });
    assert.deepEqual(numeros(f), []);
  });
});
