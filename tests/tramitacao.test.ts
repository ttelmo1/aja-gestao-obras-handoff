import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { diff } from "@/modules/auditoria/diff";
import { estaAberta, ordemDaEtapa } from "@/modules/tramitacao/fluxo";
import {
  diasNoSetor,
  diasParadoDaObra,
  estaParadoDemais,
  situacaoDaTramitacao,
  validarNovaEntrada,
  validarSaida,
} from "@/modules/tramitacao/movimentos";
import { DIAS_PARA_CONTAR_PARADO, resumoDaObra, totaisDoPainel } from "@/modules/obras/resumo";

const d = (iso: string) => new Date(`${iso}T12:00:00Z`);
const mov = (entrada: string, saida?: string) => ({
  dataEntrada: d(entrada),
  dataSaida: saida ? d(saida) : null,
});

describe("tempo no setor", () => {
  it("movimento fechado conta até a saída", () => {
    assert.equal(diasNoSetor(mov("2026-08-02", "2026-08-05")), 3);
  });

  it("movimento aberto conta até hoje e muda sozinho", () => {
    const m = mov("2026-08-12");
    assert.equal(diasNoSetor(m, d("2026-08-20")), 8);
    assert.equal(diasNoSetor(m, d("2026-08-21")), 9);
  });

  it("entrada e saída no mesmo dia é zero, não um", () => {
    assert.equal(diasNoSetor(mov("2026-08-02", "2026-08-02")), 0);
  });
});

describe("situação da tramitação", () => {
  const percurso = [
    mov("2026-08-02", "2026-08-05"),
    mov("2026-08-05", "2026-08-10"),
    mov("2026-08-12"),
  ];

  it("aponta o movimento em aberto como atual", () => {
    const s = situacaoDaTramitacao(percurso, d("2026-08-20"));
    assert.equal(s.diasParado, 8);
    assert.equal(s.atual?.dataEntrada.toISOString().slice(0, 10), "2026-08-12");
  });

  it("soma o tempo de todos os setores", () => {
    const s = situacaoDaTramitacao(percurso, d("2026-08-20"));
    assert.equal(s.diasTotais, 3 + 5 + 8);
    assert.equal(s.maiorPermanencia, 8);
    assert.equal(s.quantidadeMovimentos, 3);
  });

  it("percurso encerrado não fica parado", () => {
    const s = situacaoDaTramitacao(percurso.slice(0, 2), d("2026-08-20"));
    assert.equal(s.atual, null);
    assert.equal(s.diasParado, null);
  });

  it("sem movimento nenhum devolve zeros e nada em aberto", () => {
    const s = situacaoDaTramitacao([], d("2026-08-20"));
    assert.equal(s.atual, null);
    assert.equal(s.diasParado, null);
    assert.equal(s.diasTotais, 0);
  });

  it("acha o aberto mesmo com a lista fora de ordem de digitação", () => {
    const foraDeOrdem = [mov("2026-08-12"), mov("2026-08-01", "2026-08-02")];
    const s = situacaoDaTramitacao(foraDeOrdem, d("2026-08-20"));
    assert.equal(s.atual?.dataEntrada.toISOString().slice(0, 10), "2026-08-12");
    assert.equal(s.abertos, 1);
  });

  it("com vários abertos, o atual é o parado há mais tempo", () => {
    // Acontece na visão agregada da etapa MEDICOES: cada medição caminha
    // sozinha, e quem olha a faixa do fluxo quer ver o pior caso.
    const varios = [mov("2026-08-19"), mov("2026-07-01"), mov("2026-08-10")];
    const s = situacaoDaTramitacao(varios, d("2026-08-20"));
    assert.equal(s.atual?.dataEntrada.toISOString().slice(0, 10), "2026-07-01");
    assert.equal(s.diasParado, 50);
    assert.equal(s.abertos, 3);
  });
});

describe("validação de movimento", () => {
  it("recusa segunda entrada com uma ainda em aberto", () => {
    // Um processo está num setor de cada vez: dois abertos fariam a mesma
    // medição aparecer parada em dois lugares.
    assert.equal(
      validarNovaEntrada([mov("2026-08-12")], d("2026-08-15")),
      "JA_EXISTE_ABERTO",
    );
  });

  it("recusa entrada anterior à saída do setor anterior", () => {
    assert.equal(
      validarNovaEntrada([mov("2026-08-02", "2026-08-10")], d("2026-08-05")),
      "ENTRADA_ANTES_DA_ANTERIOR",
    );
  });

  it("aceita entrada depois da última saída", () => {
    assert.equal(
      validarNovaEntrada([mov("2026-08-02", "2026-08-10")], d("2026-08-12")),
      null,
    );
  });

  it("aceita a primeira entrada de todas", () => {
    assert.equal(validarNovaEntrada([], d("2026-08-02")), null);
  });

  it("recusa saída anterior à entrada", () => {
    assert.equal(
      validarSaida(mov("2026-08-12"), d("2026-08-10")),
      "SAIDA_ANTES_DA_ENTRADA",
    );
    assert.equal(validarSaida(mov("2026-08-12"), d("2026-08-12")), null);
  });
});

describe("dias parado da obra", () => {
  it("é o maior tempo em aberto, não a soma nem a média", () => {
    const abertos = [mov("2026-07-01"), mov("2026-08-19")];
    assert.equal(diasParadoDaObra(abertos, d("2026-08-20")), 50);
  });

  it("sem processo em aberto devolve null, não zero", () => {
    // Zero diria "parado há zero dias" e acenderia o farol de uma obra que
    // está andando normalmente.
    assert.equal(diasParadoDaObra([], d("2026-08-20")), null);
  });

  it("estaParadoDemais compara com o limite recebido", () => {
    const s = situacaoDaTramitacao([mov("2026-08-01")], d("2026-08-20"));
    assert.equal(estaParadoDemais(s, 15), true);
    assert.equal(estaParadoDemais(s, 30), false);
  });
});

describe("tramitação no farol e no painel", () => {
  // Dez dias depois da ordem de início: a primeira medição da obra mensal
  // vence em 09/02, então nada aqui acende por prazo de medição — o que este
  // bloco testa é o critério de processo parado, isolado.
  const AGORA = d("2026-01-20");

  const obra = {
    status: "EM_ANDAMENTO" as const,
    valorContratado: "1000000.00",
    valorAditivado: "0",
    dataOrdemInicio: d("2026-01-10"),
    dataPrevistaTermino: d("2027-12-31"),
    periodicidadeMedicao: "MENSAL" as const,
    intervaloMedicaoDias: null,
  };

  it("processo parado acende o farol", () => {
    const emDia = resumoDaObra(obra, [], null, AGORA);
    const parada = resumoDaObra(obra, [], 40, AGORA);

    assert.equal(emDia.farol, "VERDE");
    assert.equal(parada.farol, "VERMELHO");
    assert.ok(parada.motivosFarol.some((m) => m.includes("parado há 40 dias")));
  });

  it("o resumo carrega o tempo parado para a tela", () => {
    assert.equal(resumoDaObra(obra, [], 12, AGORA).diasParado, 12);
    assert.equal(resumoDaObra(obra, [], null, AGORA).diasParado, null);
  });

  it("conta processos parados a partir do limite do mockup", () => {
    const comDias = (dias: number | null) => ({
      status: "EM_ANDAMENTO" as const,
      resumo: resumoDaObra(obra, [], dias, AGORA),
    });

    const totais = totaisDoPainel([
      comDias(null),
      comDias(DIAS_PARA_CONTAR_PARADO - 1),
      comDias(DIAS_PARA_CONTAR_PARADO),
      comDias(40),
    ]);
    assert.equal(totais.processosParados, 2);
  });
});

describe("fluxo fixo", () => {
  it("etapa aberta é pendente ou em andamento", () => {
    assert.equal(estaAberta("PENDENTE"), true);
    assert.equal(estaAberta("EM_ANDAMENTO"), true);
    assert.equal(estaAberta("CONCLUIDA"), false);
    assert.equal(estaAberta("NAO_SE_APLICA"), false);
  });

  it("a ordem gravada é a posição no fluxo contratado", () => {
    assert.equal(ordemDaEtapa("BUSCA_LICITACAO"), 1);
    assert.equal(ordemDaEtapa("MEDICOES"), 7);
    assert.equal(ordemDaEtapa("ATESTADO"), 11);
  });
});

describe("diferença para a auditoria", () => {
  it("dinheiro com casas diferentes não conta como mudança", () => {
    // "260000" (Decimal do banco) e "260000.00" (formulário) são o mesmo
    // valor: sem isto, abrir o formulário e salvar já gerava registro.
    const r = diff({ valor: "260000" }, { valor: "260000.00" });
    assert.deepEqual(r.depois, {});
  });

  it("mudança real continua sendo registrada", () => {
    const r = diff({ valor: "260000" }, { valor: "270000.00" });
    assert.deepEqual(r.depois, { valor: "270000.00" });
  });

  it("texto diferente continua sendo mudança", () => {
    assert.deepEqual(diff({ nome: "a" }, { nome: "b" }).depois, { nome: "b" });
    assert.deepEqual(diff({ nome: "a" }, { nome: "a" }).depois, {});
  });
});
