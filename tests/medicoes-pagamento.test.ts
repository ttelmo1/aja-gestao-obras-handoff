import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { StatusMedicao } from "@/generated/prisma/enums";
import {
  erroNaDataDoPagamento,
  erroNaSituacaoPeloFormulario,
  pagamentosPendentes,
  podeMarcarComoPaga,
  totalPendente,
} from "@/modules/medicoes/pagamento";

const hoje = new Date("2026-09-24T12:00:00-03:00");

describe("marcar medição como paga", () => {
  it("só a partir de Protocolada — rascunho ainda não tem protocolo", () => {
    assert.equal(podeMarcarComoPaga(StatusMedicao.RASCUNHO), false);
    assert.equal(podeMarcarComoPaga(StatusMedicao.PROTOCOLADA), true);
    assert.equal(podeMarcarComoPaga(StatusMedicao.APROVADA), true);
    assert.equal(podeMarcarComoPaga(StatusMedicao.PAGA), false);
    assert.equal(podeMarcarComoPaga(StatusMedicao.REJEITADA), false);
  });

  it("exige a data", () => {
    assert.match(erroNaDataDoPagamento(null, hoje) ?? "", /Informe/);
  });

  it("aceita hoje e o passado, recusa amanhã", () => {
    assert.equal(erroNaDataDoPagamento(new Date("2026-09-24T12:00:00-03:00"), hoje), null);
    assert.equal(erroNaDataDoPagamento(new Date("2026-08-01T12:00:00-03:00"), hoje), null);
    assert.match(
      erroNaDataDoPagamento(new Date("2026-09-25T12:00:00-03:00"), hoje) ?? "",
      /depois de hoje/,
    );
  });
});

describe("situação pelo formulário", () => {
  it("o formulário não marca como paga", () => {
    assert.notEqual(erroNaSituacaoPeloFormulario(null, StatusMedicao.PAGA), null);
    assert.notEqual(
      erroNaSituacaoPeloFormulario(StatusMedicao.APROVADA, StatusMedicao.PAGA),
      null,
    );
  });

  it("o formulário não tira do pago", () => {
    assert.notEqual(
      erroNaSituacaoPeloFormulario(StatusMedicao.PAGA, StatusMedicao.APROVADA),
      null,
    );
  });

  it("medição paga pode ser salva de novo, e as outras trocas continuam livres", () => {
    assert.equal(erroNaSituacaoPeloFormulario(StatusMedicao.PAGA, StatusMedicao.PAGA), null);
    assert.equal(
      erroNaSituacaoPeloFormulario(StatusMedicao.RASCUNHO, StatusMedicao.APROVADA),
      null,
    );
    assert.equal(erroNaSituacaoPeloFormulario(null, StatusMedicao.RASCUNHO), null);
  });
});

describe("pagamentos pendentes do painel", () => {
  const competencia = new Date("2026-07-01T12:00:00");
  const obras = [
    {
      id: "a",
      objeto: "Contenção Paiol",
      numeroContrato: "001/2026",
      medicoes: [
        { id: "a8", numero: 8, competencia, status: StatusMedicao.APROVADA, valorMedido: "730778.06" },
        { id: "a7", numero: 7, competencia, status: StatusMedicao.PAGA, valorMedido: "1267794.67" },
        { id: "a9", numero: 9, competencia, status: StatusMedicao.PROTOCOLADA, valorMedido: "100.00" },
      ],
    },
    {
      id: "b",
      objeto: "Quadra Banqueta",
      numeroContrato: "002/2026",
      medicoes: [
        { id: "b1", numero: 1, competencia, status: StatusMedicao.REJEITADA, valorMedido: "5.00" },
        { id: "b2", numero: 2, competencia, status: StatusMedicao.APROVADA, valorMedido: "24240.31" },
      ],
    },
  ];

  it("lista só o que não foi pago nem rejeitado, na ordem das obras e das medições", () => {
    const linhas = pagamentosPendentes(obras);
    assert.deepEqual(
      linhas.map((l) => l.medicaoId),
      ["a8", "a9", "b2"],
    );
  });

  it("soma quantidade e valor sem perder centavo", () => {
    const total = totalPendente(pagamentosPendentes(obras));
    assert.equal(total.quantidade, 3);
    assert.equal(total.valor.toFixed(2), "755118.37");
  });

  it("sem pendência, zero", () => {
    const total = totalPendente([]);
    assert.equal(total.quantidade, 0);
    assert.equal(total.valor.toFixed(2), "0.00");
  });
});
