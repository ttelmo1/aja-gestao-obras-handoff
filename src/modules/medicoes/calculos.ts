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
};

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
