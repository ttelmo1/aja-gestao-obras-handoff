import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { proximaMedicao } from "@/modules/medicoes/periodicidade";
import { prazoTranscorrido, terminoVigente } from "@/modules/obras/prazo";
import { resumoDaObra } from "@/modules/obras/resumo";
import {
  diasSuspensosAteHoje,
  diasSuspensosDesde,
  duracaoDaSuspensao,
  erroNaSuspensao,
  suspensaoEmCurso,
  type Suspensao,
} from "@/modules/obras/suspensao";

const d = (iso: string) => new Date(`${iso}T12:00:00-03:00`);
const s = (inicio: string, fim: string | null = null): Suspensao => ({
  dataInicio: d(inicio),
  dataFim: fim ? d(fim) : null,
});

// Obra de 100 dias: ordem de início 01/03, término 09/06.
const ORDEM = d("2026-03-01");
const TERMINO = d("2026-06-09");

describe("dias de suspensão", () => {
  it("suspensão fechada conta do início até a data final", () => {
    const lista = [s("2026-04-01", "2026-04-11")];
    assert.equal(diasSuspensosDesde(lista, ORDEM, d("2026-05-01")), 10);
    assert.equal(diasSuspensosAteHoje(lista, ORDEM, d("2026-05-01")), 10);
  });

  it("suspensão aberta cresce um dia por dia", () => {
    const lista = [s("2026-04-01")];
    assert.equal(diasSuspensosDesde(lista, ORDEM, d("2026-04-01")), 0);
    assert.equal(diasSuspensosDesde(lista, ORDEM, d("2026-04-05")), 4);
    assert.equal(diasSuspensosDesde(lista, ORDEM, d("2026-04-20")), 19);
  });

  // Programada: já prorroga o término, mas ainda não saiu dos decorridos.
  it("suspensão futura com data final prorroga, mas ainda não foi vivida", () => {
    const lista = [s("2026-05-01", "2026-05-21")];
    assert.equal(diasSuspensosDesde(lista, ORDEM, d("2026-04-01")), 20);
    assert.equal(diasSuspensosAteHoje(lista, ORDEM, d("2026-04-01")), 0);
  });

  it("suspensão aberta que ainda não começou não conta nada", () => {
    assert.equal(diasSuspensosDesde([s("2026-05-01")], ORDEM, d("2026-04-01")), 0);
  });

  it("mais de uma suspensão soma", () => {
    const lista = [s("2026-03-10", "2026-03-15"), s("2026-04-01", "2026-04-11")];
    assert.equal(diasSuspensosDesde(lista, ORDEM, d("2026-05-01")), 15);
  });

  it("o que ficou antes da base não conta", () => {
    const lista = [s("2026-03-10", "2026-03-20")];
    // Base depois da suspensão inteira.
    assert.equal(diasSuspensosDesde(lista, d("2026-04-01"), d("2026-05-01")), 0);
    // Base no meio: só a parte depois dela.
    assert.equal(diasSuspensosDesde(lista, d("2026-03-15"), d("2026-05-01")), 5);
  });

  it("duração e suspensão em curso", () => {
    const aberta = s("2026-04-01");
    const fechada = s("2026-03-10", "2026-03-15");
    assert.equal(duracaoDaSuspensao(aberta, d("2026-04-08")), 7);
    assert.equal(duracaoDaSuspensao(fechada, d("2026-04-08")), 5);
    assert.equal(suspensaoEmCurso([fechada, aberta], d("2026-04-08")), aberta);
    assert.equal(suspensaoEmCurso([fechada], d("2026-04-08")), null);
    // No dia final a obra já voltou a contar.
    assert.equal(suspensaoEmCurso([fechada], d("2026-03-15")), null);
    assert.equal(suspensaoEmCurso([fechada], d("2026-03-14")), fechada);
  });
});

describe("prazo com suspensão — tudo para e volta de onde parou", () => {
  const suspensa = [s("2026-04-10")];

  it("o término anda junto enquanto a obra está suspensa", () => {
    const dias = diasSuspensosDesde(suspensa, ORDEM, d("2026-04-20"));
    assert.equal(dias, 10);
    assert.deepEqual(terminoVigente(TERMINO, 0, dias), d("2026-06-19"));
  });

  it("dias restantes e percentual ficam congelados durante a suspensão", () => {
    const noInicio = prazoTranscorrido(ORDEM, TERMINO, d("2026-04-10"), 0, suspensa)!;
    const dezDiasDepois = prazoTranscorrido(ORDEM, TERMINO, d("2026-04-20"), 0, suspensa)!;
    assert.equal(dezDiasDepois.diasRestantes, noInicio.diasRestantes);
    assert.equal(dezDiasDepois.percentualTranscorrido, noInicio.percentualTranscorrido);
    assert.equal(dezDiasDepois.diasDecorridos, noInicio.diasDecorridos);
    assert.equal(dezDiasDepois.diasSuspensos, 10);
    // O prazo contratado não muda: suspensão pausa, não prorroga o total.
    assert.equal(dezDiasDepois.diasTotais, 100);
  });

  it("na data final volta a contar de onde parou", () => {
    const encerrada = [s("2026-04-10", "2026-04-20")];
    const noInicio = prazoTranscorrido(ORDEM, TERMINO, d("2026-04-10"), 0, encerrada)!;
    const naRetomada = prazoTranscorrido(ORDEM, TERMINO, d("2026-04-20"), 0, encerrada)!;
    const diaSeguinte = prazoTranscorrido(ORDEM, TERMINO, d("2026-04-21"), 0, encerrada)!;
    assert.equal(naRetomada.diasRestantes, noInicio.diasRestantes);
    // Preencher a data final no meio da suspensão não faz o número pular.
    const noMeioAberta = prazoTranscorrido(ORDEM, TERMINO, d("2026-04-15"), 0, [s("2026-04-10")])!;
    const noMeioFechada = prazoTranscorrido(ORDEM, TERMINO, d("2026-04-15"), 0, encerrada)!;
    assert.equal(noMeioFechada.diasRestantes, noMeioAberta.diasRestantes);
    assert.equal(diaSeguinte.diasRestantes, noInicio.diasRestantes - 1);
    assert.deepEqual(naRetomada.terminoVigente, d("2026-06-19"));
  });

  it("obra já vencida não acumula atraso enquanto está suspensa", () => {
    const depoisDoTermino = [s("2026-06-19")]; // vencida há 10 no início
    const a = prazoTranscorrido(ORDEM, TERMINO, d("2026-06-19"), 0, depoisDoTermino)!;
    const b = prazoTranscorrido(ORDEM, TERMINO, d("2026-07-19"), 0, depoisDoTermino)!;
    assert.equal(a.diasRestantes, -10);
    assert.equal(b.diasRestantes, -10);
  });

  it("soma com o prazo aditivado da rerratificação", () => {
    const p = prazoTranscorrido(ORDEM, TERMINO, d("2026-05-01"), 30, [
      s("2026-04-01", "2026-04-11"),
    ])!;
    assert.deepEqual(p.terminoVigente, d("2026-07-19"));
    assert.equal(p.diasTotais, 130);
  });

  it("sem suspensão, nada muda", () => {
    const com = prazoTranscorrido(ORDEM, TERMINO, d("2026-05-01"), 0, []);
    const sem = prazoTranscorrido(ORDEM, TERMINO, d("2026-05-01"), 0);
    assert.deepEqual(com, sem);
  });
});

describe("ciclo de medição com suspensão", () => {
  const base = {
    status: "EM_ANDAMENTO" as const,
    periodicidadeMedicao: "MENSAL" as const,
    intervaloMedicaoDias: null,
    dataOrdemInicio: ORDEM,
    ultimaMedicaoEm: d("2026-04-01"),
  };

  it("a medição não vence enquanto a obra está suspensa", () => {
    const suspensoes = [s("2026-04-21")]; // faltavam 10 dias
    const sem = proximaMedicao({ ...base, agora: d("2026-05-20") })!;
    const com = proximaMedicao({ ...base, suspensoes, agora: d("2026-05-20") })!;
    assert.equal(sem.atrasada, true);
    assert.equal(com.atrasada, false);
    assert.equal(com.diasRestantes, 10);
  });

  it("depois da retomada, o ciclo continua de onde parou", () => {
    const suspensoes = [s("2026-04-21", "2026-05-21")];
    const m = proximaMedicao({ ...base, suspensoes, agora: d("2026-05-21") })!;
    assert.equal(m.diasRestantes, 10);
    assert.deepEqual(m.proxima, d("2026-05-31"));
  });

  it("suspensão já com data final também deixa o ciclo parado", () => {
    const suspensoes = [s("2026-04-21", "2026-05-21")];
    const m = proximaMedicao({ ...base, suspensoes, agora: d("2026-05-01") })!;
    assert.equal(m.diasRestantes, 10);
  });

  it("o resumo mostra a obra suspensa e não acende o farol por medição", () => {
    const obra = {
      status: "EM_ANDAMENTO" as const,
      valorContratado: "1000",
      valorAditivado: "0",
      dataOrdemInicio: ORDEM,
      dataPrevistaTermino: d("2026-12-31"),
      prazoAditivadoDias: 0,
      periodicidadeMedicao: "MENSAL" as const,
      intervaloMedicaoDias: null,
      suspensoes: [s("2026-04-21")],
    };
    const medicoes = [{ valorMedido: "100", competencia: d("2026-04-01"), dataMedicao: d("2026-04-01") }];
    const r = resumoDaObra(obra, medicoes, d("2026-06-30"));
    assert.deepEqual(r.suspensaDesde, d("2026-04-21"));
    assert.equal(r.diasSuspensos, 70);
    assert.equal(r.medicao?.atrasada, false);
    assert.equal(r.farol, "AMARELO"); // medição congelada a 10 dias do vencimento
  });
});

describe("validação da suspensão", () => {
  it("exige ordem de início", () => {
    assert.match(erroNaSuspensao(s("2026-04-01"), [], null) ?? "", /ordem de início/);
  });

  it("não começa antes da ordem de início", () => {
    assert.match(erroNaSuspensao(s("2026-02-01"), [], ORDEM) ?? "", /antes da ordem/);
  });

  it("data final depois do início", () => {
    assert.match(
      erroNaSuspensao(s("2026-04-10", "2026-04-10"), [], ORDEM) ?? "",
      /depois da data de início/,
    );
    assert.equal(erroNaSuspensao(s("2026-04-10", "2026-04-11"), [], ORDEM), null);
  });

  it("não se sobrepõe a outra, mas pode encostar", () => {
    const existentes = [s("2026-04-01", "2026-04-11")];
    assert.match(
      erroNaSuspensao(s("2026-04-10", "2026-04-20"), existentes, ORDEM) ?? "",
      /sobrepõe/,
    );
    assert.equal(erroNaSuspensao(s("2026-04-11", "2026-04-20"), existentes, ORDEM), null);
    assert.equal(erroNaSuspensao(s("2026-03-20", "2026-04-01"), existentes, ORDEM), null);
  });

  it("só uma pode ficar aberta — a aberta cobre tudo dali em diante", () => {
    const aberta = [s("2026-04-01")];
    assert.match(erroNaSuspensao(s("2026-05-01"), aberta, ORDEM) ?? "", /sobrepõe/);
    assert.match(
      erroNaSuspensao(s("2026-05-01", "2026-05-10"), aberta, ORDEM) ?? "",
      /sobrepõe/,
    );
    assert.equal(erroNaSuspensao(s("2026-03-10", "2026-03-20"), aberta, ORDEM), null);
  });
});
