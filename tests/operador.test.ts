import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Farol } from "@/generated/prisma/enums";
import {
  exigeOperador,
  podeAssumir,
  podeLiberar,
  situacaoDoOperador,
  type AtribuicaoOperador,
} from "@/modules/obras/operador";

const EU = "usuario-1";
const OUTRO = "usuario-2";

const livre: AtribuicaoOperador = {
  operadorId: null,
  operadorNome: null,
  operadorAssumidoEm: null,
  operadorLiberadoEm: null,
  operadorObservacao: null,
};

const assumidaPor = (id: string, nome: string): AtribuicaoOperador => ({
  operadorId: id,
  operadorNome: nome,
  operadorAssumidoEm: new Date("2026-09-05T12:00:00Z"),
  operadorLiberadoEm: null,
  operadorObservacao: "Aguardando foto.",
});

const liberadaPor = (id: string, nome: string): AtribuicaoOperador => ({
  operadorId: id,
  operadorNome: nome,
  operadorAssumidoEm: null,
  operadorLiberadoEm: new Date("2026-09-07T12:00:00Z"),
  operadorObservacao: "Aguardando foto.",
});

describe("visibilidade do operador", () => {
  it("aparece em atenção e em crítico", () => {
    assert.equal(exigeOperador(Farol.AMARELO), true);
    assert.equal(exigeOperador(Farol.VERMELHO), true);
  });

  it("não aparece em obra verde nem em obra não avaliada", () => {
    assert.equal(exigeOperador(Farol.VERDE), false);
    assert.equal(exigeOperador(Farol.CINZA), false);
  });
});

describe("situação do operador", () => {
  it("obra nunca assumida não tem nome nem histórico", () => {
    const s = situacaoDoOperador(livre);
    assert.equal(s.assumida, false);
    assert.equal(s.nome, null);
    assert.equal(s.ultimoQueMexeu, false);
  });

  it("obra assumida mostra desde quando e a justificativa", () => {
    const s = situacaoDoOperador(assumidaPor(EU, "Ana"));
    assert.equal(s.assumida, true);
    assert.equal(s.nome, "Ana");
    assert.ok(s.desde);
    assert.equal(s.observacao, "Aguardando foto.");
  });

  // O pedido do cliente, em 09/09/2026: "pode estar lá como último
  // responsável que modificou". Liberar não apaga o nome.
  it("liberada, o nome fica como último que mexeu", () => {
    const s = situacaoDoOperador(liberadaPor(EU, "Ana"));
    assert.equal(s.assumida, false);
    assert.equal(s.nome, "Ana");
    assert.equal(s.ultimoQueMexeu, true);
    assert.ok(s.liberadaEm);
  });

  it("liberada, a observação não fica — a justificativa era daquela vez", () => {
    assert.equal(situacaoDoOperador(liberadaPor(EU, "Ana")).observacao, null);
  });
});

describe("quem pode assumir e liberar", () => {
  it("qualquer um assume obra livre", () => {
    assert.equal(podeAssumir(situacaoDoOperador(livre), livre, OUTRO), true);
  });

  it("obra liberada volta a ser de quem quiser, não só de quem mexeu", () => {
    const a = liberadaPor(EU, "Ana");
    assert.equal(podeAssumir(situacaoDoOperador(a), a, OUTRO), true);
  });

  it("não se toma a obra de quem está com ela", () => {
    const a = assumidaPor(OUTRO, "Bruno");
    assert.equal(podeAssumir(situacaoDoOperador(a), a, EU), false);
  });

  it("quem assumiu reescreve a própria observação", () => {
    const a = assumidaPor(EU, "Ana");
    assert.equal(podeAssumir(situacaoDoOperador(a), a, EU), true);
  });

  it("só quem assumiu libera", () => {
    assert.equal(podeLiberar(assumidaPor(EU, "Ana"), EU), true);
    assert.equal(podeLiberar(assumidaPor(OUTRO, "Bruno"), EU), false);
  });

  it("obra já liberada não é liberada de novo", () => {
    assert.equal(podeLiberar(liberadaPor(EU, "Ana"), EU), false);
  });
});
