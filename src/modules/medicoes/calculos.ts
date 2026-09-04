import { Decimal } from "decimal.js";
import { dec, money, percentual, somar } from "@/lib/money";

/**
 * Cálculos financeiros da obra (requisitos.md 1.4).
 *
 * Nada aqui é persistido: os agregados são derivados das medições a cada
 * leitura, para não existirem duas versões da verdade. A única exceção é
 * `percentualExecutado`, que é informado pelo usuário por medição.
 */
export type MedicaoParaCalculo = {
  valorMedido: Decimal | string | number;
  percentualExecutado: Decimal | string | number;
  competencia: Date;
  /** Data do boletim; quando ausente, a competência faz as vezes. */
  dataMedicao?: Date | null;
};

/** Data que representa a medição na linha do tempo da obra. */
export function dataDeReferencia(m: MedicaoParaCalculo): Date {
  return m.dataMedicao ?? m.competencia;
}

export type ResumoFinanceiro = {
  /** valorContratado + valorAditivado */
  valorContratadoAtual: Decimal;
  valorMedidoTotal: Decimal;
  saldoAMedir: Decimal;
  /** medido / contratado atual */
  percentualMedido: Decimal;
  /** avanço físico: maior percentual informado (é acumulado) */
  percentualExecutado: Decimal;
  quantidadeMedicoes: number;
};

export function resumoFinanceiro(
  valorContratado: Decimal | string | number,
  valorAditivado: Decimal | string | number,
  medicoes: MedicaoParaCalculo[],
): ResumoFinanceiro {
  const valorContratadoAtual = money(somar(valorContratado, valorAditivado));
  const valorMedidoTotal = money(somar(...medicoes.map((m) => m.valorMedido)));

  // O percentual executado é acumulado por natureza, então o total da obra é o
  // maior valor informado, não a soma.
  const percentualExecutado = medicoes.reduce<Decimal>(
    (max, m) => Decimal.max(max, dec(m.percentualExecutado)),
    new Decimal(0),
  );

  return {
    valorContratadoAtual,
    valorMedidoTotal,
    saldoAMedir: money(valorContratadoAtual.minus(valorMedidoTotal)),
    percentualMedido: percentual(valorMedidoTotal, valorContratadoAtual),
    percentualExecutado: percentualExecutado.toDecimalPlaces(2),
    quantidadeMedicoes: medicoes.length,
  };
}

/** ISS a partir da base e da alíquota. Sem alíquota, sem imposto. */
export function calcularIss(
  base: Decimal | string | number | null | undefined,
  aliquota: Decimal | string | number | null | undefined,
): Decimal {
  if (aliquota === null || aliquota === undefined) return new Decimal(0);
  return money(dec(base).times(dec(aliquota)).dividedBy(100));
}

/**
 * Próximo número da sequência de medições da obra.
 *
 * É o maior número já usado mais um, não a quantidade: se a medição 3 for
 * excluída, a próxima ainda é a 5 — repetir um número que já circulou em
 * protocolo no órgão é confusão garantida na hora de conferir.
 */
export function proximoNumero(numerosExistentes: number[]): number {
  return numerosExistentes.reduce((max, n) => Math.max(max, n), 0) + 1;
}
