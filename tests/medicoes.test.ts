import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  competencia,
  dataOpcional,
  DIGITOS_INTEIROS_DINHEIRO,
  dinheiro,
  dinheiroOpcional,
  dinheiroOpcionalPositivo,
  normalizarDinheiro,
  percentualObrigatorio,
  percentualOpcional,
} from "@/lib/campos";
import { paraCampoDinheiro } from "@/lib/money";
import { dataDeReferencia, proximoNumero } from "@/modules/medicoes/calculos";
import {
  intervaloEmDias,
  proximaMedicao,
} from "@/modules/medicoes/periodicidade";
import { resumoDaObra, totaisDoPainel } from "@/modules/obras/resumo";

const d = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe("numeração das medições", () => {
  it("começa em 1", () => {
    assert.equal(proximoNumero([]), 1);
  });

  it("continua do maior número, não da quantidade", () => {
    // A medição 3 foi excluída: a próxima ainda é a 5, porque o número 4 já
    // circulou em protocolo no órgão.
    assert.equal(proximoNumero([1, 2, 4]), 5);
  });

  it("não se confunde com lista fora de ordem", () => {
    assert.equal(proximoNumero([7, 2, 5]), 8);
  });
});

describe("intervalo da periodicidade", () => {
  it("traduz as periodicidades fixas em dias", () => {
    assert.equal(intervaloEmDias("MENSAL", null), 30);
    assert.equal(intervaloEmDias("QUINZENAL", null), 15);
    assert.equal(intervaloEmDias("SEMANAL", null), 7);
  });

  it("personalizada usa o intervalo informado", () => {
    assert.equal(intervaloEmDias("PERSONALIZADA", 45), 45);
  });

  it("personalizada sem intervalo não inventa prazo", () => {
    assert.equal(intervaloEmDias("PERSONALIZADA", null), null);
    assert.equal(intervaloEmDias("PERSONALIZADA", 0), null);
  });
});

describe("próxima medição", () => {
  const base = {
    status: "EM_ANDAMENTO" as const,
    periodicidadeMedicao: "MENSAL" as const,
    intervaloMedicaoDias: null,
    dataOrdemInicio: d("2026-01-10"),
  };

  it("conta a partir da última medição lançada", () => {
    const r = proximaMedicao({
      ...base,
      ultimaMedicaoEm: d("2026-06-30"),
      agora: d("2026-07-10"),
    });
    assert.ok(r);
    assert.equal(r.proxima.toISOString().slice(0, 10), "2026-07-30");
    assert.equal(r.diasRestantes, 20);
    assert.equal(r.atrasada, false);
  });

  it("sem medição nenhuma, conta da ordem de início", () => {
    const r = proximaMedicao({ ...base, ultimaMedicaoEm: null, agora: d("2026-02-01") });
    assert.ok(r);
    assert.equal(r.ultima, null);
    assert.equal(r.proxima.toISOString().slice(0, 10), "2026-02-09");
  });

  it("marca como atrasada quando o ciclo venceu", () => {
    const r = proximaMedicao({
      ...base,
      ultimaMedicaoEm: d("2026-06-30"),
      agora: d("2026-08-15"),
    });
    assert.ok(r);
    assert.equal(r.atrasada, true);
    assert.equal(r.diasRestantes, -16);
  });

  it("obra sem ordem de início não tem prazo a cobrar", () => {
    const r = proximaMedicao({
      ...base,
      status: "PLANEJAMENTO",
      dataOrdemInicio: null,
      ultimaMedicaoEm: null,
    });
    assert.equal(r, null);
  });

  it("obra finalizada, cancelada ou paralisada não cobra medição", () => {
    for (const status of ["FINALIZADA", "CANCELADA", "PARALISADA"] as const) {
      const r = proximaMedicao({ ...base, status, ultimaMedicaoEm: d("2026-01-10") });
      assert.equal(r, null, status);
    }
  });

  it("personalizada sem intervalo devolve null em vez de chutar 30 dias", () => {
    const r = proximaMedicao({
      ...base,
      periodicidadeMedicao: "PERSONALIZADA",
      ultimaMedicaoEm: d("2026-06-30"),
    });
    assert.equal(r, null);
  });
});

describe("data de referência da medição", () => {
  it("usa a data do boletim quando existe", () => {
    const m = {
      valorMedido: "1",
      competencia: d("2026-07-01"),
      dataMedicao: d("2026-07-31"),
    };
    assert.equal(dataDeReferencia(m).toISOString().slice(0, 10), "2026-07-31");
  });

  it("cai na competência quando o boletim não foi datado", () => {
    const m = {
      valorMedido: "1",
      competencia: d("2026-07-01"),
      dataMedicao: null,
    };
    assert.equal(dataDeReferencia(m).toISOString().slice(0, 10), "2026-07-01");
  });
});

describe("resumo da obra com medições", () => {
  const obra = {
    status: "EM_ANDAMENTO" as const,
    valorContratado: "1200000.00",
    valorAditivado: "0",
    dataOrdemInicio: d("2026-01-10"),
    dataPrevistaTermino: d("2026-12-31"),
    periodicidadeMedicao: "MENSAL" as const,
    intervaloMedicaoDias: null,
  };

  const medicoes = [
    {
      valorMedido: "300000",
      competencia: d("2026-06-01"),
      dataMedicao: d("2026-06-30"),
    },
    {
      valorMedido: "348000",
      competencia: d("2026-07-01"),
      dataMedicao: d("2026-07-31"),
    },
  ];

  it("acha a última medição mesmo com a lista fora de ordem", () => {
    const r = resumoDaObra(obra, [...medicoes].reverse(), null, d("2026-08-10"));
    assert.ok(r.medicao);
    assert.equal(r.medicao.ultima?.toISOString().slice(0, 10), "2026-07-31");
  });

  it("aponta o vencimento do próximo ciclo", () => {
    const r = resumoDaObra(obra, medicoes, null, d("2026-08-10"));
    assert.ok(r.medicao);
    assert.equal(r.medicao.proxima.toISOString().slice(0, 10), "2026-08-30");
    assert.equal(r.medicao.atrasada, false);
  });

  it("conta as obras com ciclo vencido no painel", () => {
    const emDia = {
      status: "EM_ANDAMENTO" as const,
      resumo: resumoDaObra(obra, medicoes, null, d("2026-08-10")),
    };
    const atrasada = {
      status: "EM_ANDAMENTO" as const,
      resumo: resumoDaObra(obra, medicoes, null, d("2026-10-10")),
    };

    assert.equal(totaisDoPainel([emDia, atrasada]).medicoesAtrasadas, 1);
    assert.equal(totaisDoPainel([emDia]).medicoesAtrasadas, 0);
  });
});

describe("campos do formulário de medição", () => {
  it("competência vira o primeiro dia do mês", () => {
    const r = competencia.parse("2026-07");
    assert.equal(r.getFullYear(), 2026);
    assert.equal(r.getMonth(), 6);
    assert.equal(r.getDate(), 1);
  });

  it("competência em branco é recusada com mensagem legível", () => {
    const r = competencia.safeParse("");
    assert.equal(r.success, false);
    assert.match(r.error!.issues[0]!.message, /competência/i);
  });

  it("dinheiro opcional em branco é null, não zero", () => {
    // Zero diria "a nota é de R$ 0,00"; null diz "ainda não informado".
    assert.equal(dinheiroOpcional.parse(""), null);
    assert.equal(dinheiroOpcional.parse("1.500,50"), "1500.50");
  });

  it("nota fiscal e ISS não aceitam valor negativo", () => {
    // `dinheiro` continua aceitando negativo de propósito — a rerratificação
    // usa isso para supressão. Aqui, não faz sentido.
    assert.equal(dinheiroOpcionalPositivo.parse(""), null);
    assert.equal(dinheiroOpcionalPositivo.parse("1.500,50"), "1500.50");
    assert.equal(dinheiroOpcionalPositivo.safeParse("-500,00").success, false);
    assert.equal(dinheiro.parse("-500,00"), "-500.00");
  });

  it("data malformada é erro, não campo esvaziado em silêncio", () => {
    assert.equal(dataOpcional.parse(""), null);
    // 30 de fevereiro não existe, e `new Date` a converteria em 02/03 calado.
    assert.equal(dataOpcional.safeParse("2026-02-30").success, false);
    assert.equal(dataOpcional.safeParse("31/12/2026").success, false);
    assert.equal(dataOpcional.safeParse("2026-13-01").success, false);
    assert.equal(dataOpcional.safeParse("ontem").success, false);
    assert.ok(dataOpcional.parse("2026-09-07") instanceof Date);
  });

  it("valor maior que a coluna do banco é recusado no formulário", () => {
    // `Decimal(15, 2)` guarda 13 dígitos inteiros; acima disso o insert
    // estouraria no banco e viraria erro 500 em vez de mensagem na tela.
    const noLimite = "9".repeat(DIGITOS_INTEIROS_DINHEIRO);
    assert.equal(normalizarDinheiro(noLimite), `${noLimite}.00`);
    assert.equal(normalizarDinheiro("9".repeat(DIGITOS_INTEIROS_DINHEIRO + 1)), null);
    assert.equal(dinheiro.safeParse("9".repeat(DIGITOS_INTEIROS_DINHEIRO + 1)).success, false);
  });

  it("percentual aceita vírgula e recusa acima de 100", () => {
    assert.equal(percentualObrigatorio.parse("58,5"), "58.50");
    assert.equal(percentualObrigatorio.safeParse("101").success, false);
    assert.equal(percentualObrigatorio.safeParse("").success, false);
    assert.equal(percentualOpcional.parse(""), null);
  });
});

describe("leitura de dinheiro digitado", () => {
  it("aceita o formato pt-BR completo", () => {
    assert.equal(normalizarDinheiro("1.200.000,00"), "1200000.00");
    assert.equal(normalizarDinheiro("1.200,50"), "1200.50");
    assert.equal(normalizarDinheiro("0,99"), "0.99");
  });

  it("aceita o valor cru que o próprio formulário devolve", () => {
    // O bug que isto tranca: "260000.00" lido como milhar virava 26.000.000 —
    // bastava abrir a aba Contrato e salvar sem tocar em nada.
    assert.equal(normalizarDinheiro("260000.00"), "260000.00");
    assert.equal(normalizarDinheiro("1200.5"), "1200.50");
  });

  it("ponto seguido de 3 dígitos é milhar, não centavo", () => {
    assert.equal(normalizarDinheiro("1.200"), "1200.00");
    assert.equal(normalizarDinheiro("1.200.000"), "1200000.00");
  });

  it("mistura de milhar e decimal com ponto", () => {
    assert.equal(normalizarDinheiro("1.200.000.00"), "1200000.00");
  });

  it("sobrevive ao ida e volta pelo campo do formulário", () => {
    for (const valor of ["260000.00", "1200000.00", "0.99", "1200.50"]) {
      const noCampo = paraCampoDinheiro(valor)!;
      assert.equal(normalizarDinheiro(noCampo), valor, `${valor} -> ${noCampo}`);
    }
  });

  it("recusa o que não é número", () => {
    assert.equal(normalizarDinheiro("abc"), null);
    assert.equal(normalizarDinheiro(""), null);
    assert.equal(dinheiroOpcional.safeParse("R$ 10").success, false);
  });

  it("valor em branco é zero no campo obrigatório e null no opcional", () => {
    assert.equal(dinheiro.parse(""), "0.00");
    assert.equal(dinheiroOpcional.parse(""), null);
  });
});
