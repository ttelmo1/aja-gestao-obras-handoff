import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { proximoCodigo } from "@/modules/obras/codigo";
import {
  condicaoDeBusca,
  filtrarPorFarol,
  FILTROS_VAZIOS,
  lerFiltros,
  temFiltroAtivo,
} from "@/modules/obras/filtros";
import { prazoTranscorrido, terminoPrevisto } from "@/modules/obras/prazo";
import { resumoDaObra, totaisDoPainel } from "@/modules/obras/resumo";

const d = (iso: string) => new Date(`${iso}T12:00:00-03:00`);

describe("prazo contratual", () => {
  it("deriva o término da ordem de início mais o prazo", () => {
    const fim = terminoPrevisto(d("2026-03-10"), 180);
    assert.equal(fim?.toISOString().slice(0, 10), "2026-09-06");
  });

  it("não deriva nada sem ordem de início ou sem prazo", () => {
    assert.equal(terminoPrevisto(null, 180), null);
    assert.equal(terminoPrevisto(d("2026-03-10"), null), null);
    assert.equal(terminoPrevisto(d("2026-03-10"), 0), null);
  });

  it("calcula o transcorrido no meio do prazo", () => {
    const p = prazoTranscorrido(d("2026-01-01"), d("2026-12-31"), d("2026-07-01"));
    assert.ok(p);
    assert.equal(p.diasTotais, 364);
    assert.equal(p.diasDecorridos, 181);
    assert.equal(p.percentualTranscorrido, 50);
    assert.equal(p.vencido, false);
  });

  it("passa de 100% e marca vencido depois do término", () => {
    const p = prazoTranscorrido(d("2026-01-01"), d("2026-06-30"), d("2026-09-04"));
    assert.ok(p);
    assert.equal(p.vencido, true);
    assert.ok(p.diasRestantes < 0);
    assert.ok(p.percentualTranscorrido > 100);
  });

  it("devolve null sem datas — obra em planejamento não tem relógio correndo", () => {
    assert.equal(prazoTranscorrido(null, d("2026-12-31")), null);
    assert.equal(prazoTranscorrido(d("2026-01-01"), null), null);
  });

  it("devolve null quando o término não é depois do início", () => {
    assert.equal(prazoTranscorrido(d("2026-05-10"), d("2026-05-10")), null);
    assert.equal(prazoTranscorrido(d("2026-05-10"), d("2026-05-01")), null);
  });
});

describe("código da obra", () => {
  it("começa em 001 quando não há obra no ano", () => {
    assert.equal(proximoCodigo(2026, []), "OBR-2026-001");
  });

  it("continua do maior número do ano, não da quantidade", () => {
    assert.equal(
      proximoCodigo(2026, ["OBR-2026-001", "OBR-2026-007", "OBR-2026-003"]),
      "OBR-2026-008",
    );
  });

  it("não reaproveita número de obra apagada", () => {
    // 002 foi excluída; a próxima ainda é 004, para não colidir com papel.
    assert.equal(proximoCodigo(2026, ["OBR-2026-001", "OBR-2026-003"]), "OBR-2026-004");
  });

  it("ignora códigos de outro ano e códigos fora do padrão", () => {
    assert.equal(
      proximoCodigo(2026, ["OBR-2025-090", "CONTRATO-15", "obra antiga"]),
      "OBR-2026-001",
    );
  });

  it("aceita códigos existentes em minúsculas", () => {
    assert.equal(proximoCodigo(2026, ["obr-2026-012"]), "OBR-2026-013");
  });
});

describe("filtros do painel", () => {
  it("URL vazia não filtra nada", () => {
    const f = lerFiltros({});
    assert.deepEqual(f, FILTROS_VAZIOS);
    assert.equal(temFiltroAtivo(f), false);
    assert.deepEqual(condicaoDeBusca(f), {});
  });

  it("descarta status e farol inválidos em vez de quebrar a tela", () => {
    const f = lerFiltros({ status: "INVENTADO", farol: "ROXO" });
    assert.equal(f.status, null);
    assert.equal(f.farol, null);
  });

  it("aceita status e farol válidos", () => {
    const f = lerFiltros({ status: "EM_ANDAMENTO", farol: "VERMELHO" });
    assert.equal(f.status, "EM_ANDAMENTO");
    assert.equal(f.farol, "VERMELHO");
    assert.equal(temFiltroAtivo(f), true);
  });

  it("a busca cobre código, objeto, contrato, protocolo, contratante e responsável", () => {
    const onde = condicaoDeBusca(lerFiltros({ busca: "015/2026" })) as {
      OR: Array<Record<string, unknown>>;
    };
    assert.equal(onde.OR.length, 6);
    const campos = onde.OR.flatMap((c) => Object.keys(c));
    for (const campo of [
      "codigo",
      "objeto",
      "numeroContrato",
      "numeroProcesso",
      "contratante",
      "responsavel",
    ]) {
      assert.ok(campos.includes(campo), campo);
    }
  });

  it("o farol não entra na condição do banco — é aplicado depois", () => {
    const onde = condicaoDeBusca(lerFiltros({ farol: "VERDE" }));
    assert.equal("farol" in onde, false);
    const obras = [{ farol: "VERDE" as const }, { farol: "VERMELHO" as const }];
    assert.equal(filtrarPorFarol(obras, "VERDE").length, 1);
    assert.equal(filtrarPorFarol(obras, null).length, 2);
  });
});

describe("resumo da obra", () => {
  const base = {
    status: "EM_ANDAMENTO" as const,
    valorContratado: "1200000.00",
    valorAditivado: "0",
    dataOrdemInicio: d("2026-03-10"),
    dataPrevistaTermino: d("2026-12-31"),
  };

  it("sem medição, não inventa avanço físico nem acusa atraso de execução", () => {
    const r = resumoDaObra(base, [], null, d("2026-09-04"));
    assert.equal(r.financeiro.quantidadeMedicoes, 0);
    assert.equal(r.financeiro.valorMedidoTotal.toString(), "0");
    assert.equal(r.financeiro.saldoAMedir.toString(), "1200000");
    assert.equal(
      r.motivosFarol.some((m) => m.includes("atrás do previsto")),
      false,
    );
  });

  it("soma as medições e usa o maior percentual executado", () => {
    const r = resumoDaObra(
      base,
      [
        { valorMedido: "300000", percentualExecutado: "25", competencia: d("2026-06-30") },
        { valorMedido: "348000", percentualExecutado: "58", competencia: d("2026-07-31") },
      ],
      null,
      d("2026-09-04"),
    );
    assert.equal(r.financeiro.valorMedidoTotal.toString(), "648000");
    assert.equal(r.financeiro.percentualExecutado.toString(), "58");
    assert.equal(r.financeiro.saldoAMedir.toString(), "552000");
    assert.equal(r.financeiro.percentualMedido.toString(), "54");
  });

  it("obra sem ordem de início fica cinza e sem prazo", () => {
    const r = resumoDaObra(
      { ...base, status: "PLANEJAMENTO", dataOrdemInicio: null, dataPrevistaTermino: null },
      [],
      null,
      d("2026-09-04"),
    );
    assert.equal(r.farol, "CINZA");
    assert.equal(r.prazo, null);
  });

  it("obra paralisada fica vermelha independentemente do prazo", () => {
    const r = resumoDaObra({ ...base, status: "PARALISADA" }, [], null, d("2026-04-01"));
    assert.equal(r.farol, "VERMELHO");
  });
});

describe("totais do painel", () => {
  const obra = (contratado: string, medido: string) => ({
    status: "EM_ANDAMENTO" as const,
    resumo: resumoDaObra(
      {
        status: "EM_ANDAMENTO" as const,
        valorContratado: contratado,
        valorAditivado: "0",
        dataOrdemInicio: d("2026-01-01"),
        dataPrevistaTermino: d("2026-12-31"),
      },
      medido === "0"
        ? []
        : [{ valorMedido: medido, percentualExecutado: "50", competencia: d("2026-06-30") }],
      null,
      d("2026-07-01"),
    ),
  });

  it("soma contratado, medido e saldo sobre as obras filtradas", () => {
    const t = totaisDoPainel([obra("1000000", "400000"), obra("500000", "0")]);
    assert.equal(t.quantidade, 2);
    assert.equal(t.emAndamento, 2);
    assert.equal(t.valorContratado.toString(), "1500000");
    assert.equal(t.valorMedido.toString(), "400000");
    assert.equal(t.saldoAMedir.toString(), "1100000");
  });

  it("lista vazia soma zero, sem quebrar", () => {
    const t = totaisDoPainel([]);
    assert.equal(t.quantidade, 0);
    assert.equal(t.valorContratado.toString(), "0");
    assert.equal(t.saldoAMedir.toString(), "0");
  });

  it("conta em andamento separado do total", () => {
    const t = totaisDoPainel([
      obra("100", "0"),
      { ...obra("100", "0"), status: "FINALIZADA" as const },
    ]);
    assert.equal(t.quantidade, 2);
    assert.equal(t.emAndamento, 1);
  });
});
