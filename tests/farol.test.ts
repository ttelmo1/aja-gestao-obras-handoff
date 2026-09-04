import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcularFarol } from "@/modules/farol/regras";
import { Farol, StatusObra } from "@/generated/prisma/enums";

const AGORA = new Date("2026-06-01T12:00:00Z");

function entrada(over: Partial<Parameters<typeof calcularFarol>[0]> = {}) {
  return {
    status: StatusObra.EM_ANDAMENTO,
    dataOrdemInicio: new Date("2026-01-01"),
    dataPrevistaTermino: new Date("2026-12-31"),
    percentualExecutado: 45,
    diasParado: null,
    agora: AGORA,
    ...over,
  };
}

describe("calcularFarol", () => {
  it("obra em dia fica verde", () => {
    assert.equal(calcularFarol(entrada()).farol, Farol.VERDE);
  });

  it("obra paralisada é sempre vermelha", () => {
    const r = calcularFarol(entrada({ status: StatusObra.PARALISADA }));
    assert.equal(r.farol, Farol.VERMELHO);
  });

  it("obra finalizada é verde mesmo com prazo vencido", () => {
    const r = calcularFarol(
      entrada({
        status: StatusObra.FINALIZADA,
        dataPrevistaTermino: new Date("2026-01-01"),
      }),
    );
    assert.equal(r.farol, Farol.VERDE);
  });

  it("sem ordem de início fica cinza, não verde", () => {
    const r = calcularFarol(
      entrada({ status: StatusObra.PLANEJAMENTO, dataOrdemInicio: null }),
    );
    assert.equal(r.farol, Farol.CINZA);
  });

  it("prazo vencido é vermelho", () => {
    const r = calcularFarol(
      entrada({ dataPrevistaTermino: new Date("2026-05-01") }),
    );
    assert.equal(r.farol, Farol.VERMELHO);
    assert.match(r.motivos.join(" "), /Prazo vencido/);
  });

  it("prazo próximo é amarelo", () => {
    const r = calcularFarol(
      entrada({
        dataPrevistaTermino: new Date("2026-06-20"),
        percentualExecutado: 100,
      }),
    );
    assert.equal(r.farol, Farol.AMARELO);
  });

  it("processo parado 20 dias é amarelo; 40 dias é vermelho", () => {
    assert.equal(calcularFarol(entrada({ diasParado: 20 })).farol, Farol.AMARELO);
    assert.equal(calcularFarol(entrada({ diasParado: 40 })).farol, Farol.VERMELHO);
  });

  it("execução muito atrás do prazo é vermelha", () => {
    // 5 dos 12 meses decorridos (~41% esperado) com 5% executado.
    const r = calcularFarol(entrada({ percentualExecutado: 5 }));
    assert.equal(r.farol, Farol.VERMELHO);
  });

  it("execução adiantada não penaliza", () => {
    const r = calcularFarol(entrada({ percentualExecutado: 90 }));
    assert.equal(r.farol, Farol.VERDE);
  });

  it("sempre explica o motivo", () => {
    assert.ok(calcularFarol(entrada()).motivos.length > 0);
  });
});
