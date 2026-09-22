import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcularFarol, ROTULOS_FAROL } from "@/modules/farol/regras";
import { Farol, StatusObra } from "@/generated/prisma/enums";

const AGORA = new Date("2026-06-01T12:00:00Z");

function entrada(over: Partial<Parameters<typeof calcularFarol>[0]> = {}) {
  return {
    status: StatusObra.EM_ANDAMENTO,
    dataOrdemInicio: new Date("2026-01-01"),
    dataTerminoVigente: new Date("2026-12-31"),
    diasParaMedicao: null,
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
        dataTerminoVigente: new Date("2026-01-01"),
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
      entrada({ dataTerminoVigente: new Date("2026-05-01") }),
    );
    assert.equal(r.farol, Farol.VERMELHO);
    assert.match(r.motivos.join(" "), /Prazo vencido/);
  });

  it("prazo próximo é amarelo", () => {
    const r = calcularFarol(
      entrada({ dataTerminoVigente: new Date("2026-06-20") }),
    );
    assert.equal(r.farol, Farol.AMARELO);
  });

  // Número dado pelo cliente em 09/09/2026, confirmado duas vezes: dez dias
  // antes do vencimento acende o amarelo. Numa obra mensal, é o 20º dia.
  it("medição a vencer em dez dias é amarela; em onze, ainda verde", () => {
    assert.equal(calcularFarol(entrada({ diasParaMedicao: 10 })).farol, Farol.AMARELO);
    assert.equal(calcularFarol(entrada({ diasParaMedicao: 11 })).farol, Farol.VERDE);
  });

  it("medição vencida é vermelha e diz há quantos dias", () => {
    const r = calcularFarol(entrada({ diasParaMedicao: -3 }));
    assert.equal(r.farol, Farol.VERMELHO);
    assert.match(r.motivos.join(" "), /Medição vencida há 3 dia/);
  });

  it("medição vence hoje ainda é amarela, não vermelha", () => {
    assert.equal(calcularFarol(entrada({ diasParaMedicao: 0 })).farol, Farol.AMARELO);
  });

  it("obra sem prazo de medição a cobrar não acende por isso", () => {
    assert.equal(calcularFarol(entrada({ diasParaMedicao: null })).farol, Farol.VERDE);
  });

  it("sempre explica o motivo", () => {
    assert.ok(calcularFarol(entrada()).motivos.length > 0);
  });

  // Confirmado pelo engenheiro em 07/09/2026: "qualquer problema" acende.
  it("basta um critério para acender, mesmo com o resto em dia", () => {
    const r = calcularFarol(entrada({ diasParaMedicao: -3 }));
    assert.equal(r.farol, Farol.VERMELHO);
    assert.match(r.motivos.join(" "), /Medição vencida/);
  });

  it("acumula os motivos quando mais de um critério acende", () => {
    const r = calcularFarol(
      entrada({
        dataTerminoVigente: new Date("2026-06-20"),
        diasParaMedicao: -3,
      }),
    );
    assert.equal(r.farol, Farol.VERMELHO);
    assert.equal(r.motivos.length, 2); // prazo próximo e medição vencida
  });

  it("o motivo principal é o do pior nível, não o primeiro da lista", () => {
    // Prazo próximo (amarelo) vem antes de medição vencida (vermelho) na
    // ordem de avaliação — o cartão precisa mostrar o segundo.
    const r = calcularFarol(
      entrada({
        dataTerminoVigente: new Date("2026-06-20"),
        diasParaMedicao: -3,
      }),
    );
    assert.equal(r.farol, Farol.VERMELHO);
    assert.match(r.motivoPrincipal ?? "", /Medição vencida/);
  });

  it("obra em dia também tem motivo principal", () => {
    assert.equal(
      calcularFarol(entrada()).motivoPrincipal,
      "Dentro do prazo e sem pendências.",
    );
  });

  it("são três faixas mais o cinza — o laranja não existe no enum", () => {
    assert.deepEqual(Object.keys(ROTULOS_FAROL).sort(), [
      "AMARELO",
      "CINZA",
      "VERDE",
      "VERMELHO",
    ]);
  });
});
