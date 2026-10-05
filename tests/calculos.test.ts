import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcularIss, resumoFinanceiro } from "@/modules/medicoes/calculos";
import { percentual } from "@/lib/money";

describe("resumoFinanceiro", () => {
  const medicoes = [
    { valorMedido: "100000.00", competencia: new Date("2026-01-31") },
    { valorMedido: "150000.00", competencia: new Date("2026-02-28") },
  ];

  it("soma medições e calcula saldo sobre o contrato atual", () => {
    const r = resumoFinanceiro("1000000.00", "0", medicoes);
    assert.equal(r.valorMedidoTotal.toString(), "250000");
    assert.equal(r.saldoAMedir.toString(), "750000");
    assert.equal(r.percentualMedido.toString(), "25");
  });

  it("inclui o aditivo no valor contratado atual", () => {
    const r = resumoFinanceiro("1000000.00", "200000.00", medicoes);
    assert.equal(r.valorContratadoAtual.toString(), "1200000");
    assert.equal(r.saldoAMedir.toString(), "950000");
  });

  it("aceita aditivo negativo (supressão)", () => {
    const r = resumoFinanceiro("1000000.00", "-100000.00", medicoes);
    assert.equal(r.valorContratadoAtual.toString(), "900000");
  });

  it("não quebra sem medições", () => {
    const r = resumoFinanceiro("1000000.00", "0", []);
    assert.equal(r.valorMedidoTotal.toString(), "0");
    assert.equal(r.percentualMedido.toString(), "0");
    assert.equal(r.quantidadeMedicoes, 0);
  });

  it("contrato zerado não gera divisão por zero", () => {
    const r = resumoFinanceiro("0", "0", []);
    assert.equal(r.percentualMedido.toString(), "0");
  });

  it("não acumula erro de ponto flutuante", () => {
    // 0.1 + 0.2 em float daria 0.30000000000000004.
    const r = resumoFinanceiro("1.00", "0", [
      { valorMedido: "0.10", competencia: new Date() },
      { valorMedido: "0.20", competencia: new Date() },
    ]);
    assert.equal(r.valorMedidoTotal.toString(), "0.3");
    assert.equal(r.saldoAMedir.toString(), "0.7");
  });
});

describe("calcularIss", () => {
  it("aplica a alíquota sobre a base", () => {
    assert.equal(calcularIss("10000.00", "5.00").toString(), "500");
  });
  it("sem alíquota, sem imposto", () => {
    assert.equal(calcularIss("10000.00", null).toString(), "0");
  });
});

describe("percentual", () => {
  it("arredonda a 2 casas", () => {
    assert.equal(percentual("1", "3").toString(), "33.33");
  });
});
