import assert from "node:assert/strict";
import { Decimal } from "decimal.js";
import { describe, it } from "node:test";

import {
  impactoDasRerratificacoes,
  LIMITE_ACRESCIMO_PERCENTUAL,
  percentualAcumulado,
  proximoNumeroRerratificacao,
} from "@/modules/rerratificacoes/calculos";
import { resumoFinanceiro } from "@/modules/medicoes/calculos";

const r = (
  status: "EM_ELABORACAO" | "PROTOCOLADA" | "APROVADA" | "REJEITADA",
  valor: string,
  prazo?: number,
) => ({ status, valorImpactado: valor, prazoAdicionalDias: prazo ?? null });

describe("impacto das rerratificações", () => {
  it("só a aprovada entra no valor do contrato", () => {
    // Em elaboração e protocolada ainda podem ser negadas; somá-las inflaria
    // o saldo a medir com dinheiro que talvez nunca exista.
    const i = impactoDasRerratificacoes([
      r("APROVADA", "120000.00"),
      r("PROTOCOLADA", "50000.00"),
      r("EM_ELABORACAO", "30000.00"),
      r("REJEITADA", "999999.00"),
    ]);
    assert.equal(i.valorAprovado.toString(), "120000");
    assert.equal(i.valorEmAndamento.toString(), "80000");
    assert.equal(i.quantidadeAprovadas, 1);
    assert.equal(i.quantidadeEmAndamento, 2);
  });

  it("rejeitada não conta nem como expectativa", () => {
    const i = impactoDasRerratificacoes([r("REJEITADA", "500000.00")]);
    assert.equal(i.valorAprovado.toString(), "0");
    assert.equal(i.valorEmAndamento.toString(), "0");
  });

  it("supressão é aditivo negativo e diminui o contrato", () => {
    const i = impactoDasRerratificacoes([
      r("APROVADA", "100000.00"),
      r("APROVADA", "-40000.00"),
    ]);
    assert.equal(i.valorAprovado.toString(), "60000");
  });

  it("soma o prazo adicional só das aprovadas", () => {
    const i = impactoDasRerratificacoes([
      r("APROVADA", "0", 30),
      r("APROVADA", "0", 15),
      r("PROTOCOLADA", "0", 90),
    ]);
    assert.equal(i.prazoAdicionalDias, 45);
  });

  it("obra sem rerratificação devolve zeros", () => {
    const i = impactoDasRerratificacoes([]);
    assert.equal(i.valorAprovado.toString(), "0");
    assert.equal(i.prazoAdicionalDias, 0);
  });
});

describe("percentual acumulado sobre o contrato", () => {
  it("mede sobre o valor ORIGINAL, não sobre o já aditivado", () => {
    // Sobre o aditivado, cada novo aditivo pareceria menor que o anterior e
    // o teto legal nunca chegaria.
    const a = percentualAcumulado("1000000.00", "250000.00");
    assert.equal(a.percentual.toString(), "25");
    assert.equal(a.excedeLimite, false);
  });

  it("acende o alerta acima do limite da Lei 14.133", () => {
    const a = percentualAcumulado("1000000.00", "260000.00");
    assert.equal(a.percentual.toString(), "26");
    assert.equal(a.excedeLimite, true);
  });

  it("exatamente no limite não é excesso", () => {
    assert.equal(
      percentualAcumulado("1000000.00", `${LIMITE_ACRESCIMO_PERCENTUAL * 10000}`)
        .excedeLimite,
      false,
    );
  });

  it("supressão dá percentual negativo e, dentro do limite, não acende alerta", () => {
    const a = percentualAcumulado("1000000.00", "-100000.00");
    assert.equal(a.percentual.toString(), "-10");
    assert.equal(a.excedeLimite, false);
  });

  it("supressão além do limite acende o alerta, como o acréscimo", () => {
    // O art. 125 fala em "acréscimos e supressões" de até 25%: o teto vale
    // para os dois lados. Comparar sem módulo deixava -40% passar calado.
    const a = percentualAcumulado("1000000.00", "-400000.00");
    assert.equal(a.percentual.toString(), "-40");
    assert.equal(a.excedeLimite, true);
  });

  it("supressão exatamente no limite não é excesso", () => {
    const a = percentualAcumulado("1000000.00", "-250000.00");
    assert.equal(a.percentual.toString(), "-25");
    assert.equal(a.excedeLimite, false);
  });

  it("contrato zerado não gera divisão por zero", () => {
    assert.equal(percentualAcumulado("0", "1000").percentual.toString(), "0");
  });
});

describe("numeração das rerratificações", () => {
  it("continua do maior número, não da contagem", () => {
    assert.equal(proximoNumeroRerratificacao([]), 1);
    assert.equal(proximoNumeroRerratificacao([1, 3]), 4);
  });
});

describe("aditivo dentro do cálculo financeiro da obra", () => {
  it("o aditivo aprovado aumenta o saldo a medir", () => {
    const medicoes = [
      { valorMedido: "500000.00", competencia: new Date() },
    ];
    const semAditivo = resumoFinanceiro("1000000.00", "0", medicoes);
    const comAditivo = resumoFinanceiro(
      "1000000.00",
      impactoDasRerratificacoes([r("APROVADA", "200000.00")]).valorAprovado,
      medicoes,
    );

    assert.equal(semAditivo.saldoAMedir.toString(), "500000");
    assert.equal(comAditivo.saldoAMedir.toString(), "700000");
    // O % medido cai porque o contrato cresceu, não porque mediram menos.
    assert.equal(semAditivo.percentualMedido.toString(), "50");
    assert.equal(comAditivo.percentualMedido.toString(), "41.67");
  });

  it("supressão aprovada reduz o contrato e aperta o saldo", () => {
    const r2 = resumoFinanceiro(
      "1000000.00",
      impactoDasRerratificacoes([r("APROVADA", "-200000.00")]).valorAprovado,
      [{ valorMedido: "500000.00", competencia: new Date() }],
    );
    assert.equal(r2.valorContratadoAtual.toString(), "800000");
    assert.equal(r2.saldoAMedir.toString(), "300000");
  });
});

describe("o que conta como rerratificação válida", () => {
  const podeSalvar = (valor: string, prazo: number | null) =>
    !new Decimal(valor).isZero() || prazo !== null;

  it("aditivo só de prazo é válido — prorrogação sem custo existe", () => {
    assert.equal(podeSalvar("0.00", 60), true);
  });

  it("aditivo só de valor é válido", () => {
    assert.equal(podeSalvar("120000.00", null), true);
  });

  it("sem valor e sem prazo não altera o contrato — recusado", () => {
    assert.equal(podeSalvar("0.00", null), false);
  });

  it("supressão sem prazo continua válida", () => {
    assert.equal(podeSalvar("-40000.00", null), true);
  });
});
