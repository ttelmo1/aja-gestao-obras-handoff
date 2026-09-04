import { Decimal } from "decimal.js";

/**
 * Dinheiro e percentuais nunca passam por `number`: o Prisma devolve Decimal
 * e é assim que continua até a formatação final.
 */
export type Dinheiro = Decimal;

export function dec(valor: Decimal.Value | null | undefined): Decimal {
  if (valor === null || valor === undefined) return new Decimal(0);
  return new Decimal(valor.toString());
}

/** Soma tolerante a nulos. */
export function somar(...valores: Array<Decimal.Value | null | undefined>): Decimal {
  return valores.reduce<Decimal>((acc, v) => acc.plus(dec(v)), new Decimal(0));
}

/**
 * Percentual de `parte` sobre `total`, arredondado a 2 casas.
 * Total zero devolve 0 — divisão por zero aqui é dado incompleto, não erro.
 */
export function percentual(
  parte: Decimal.Value | null | undefined,
  total: Decimal.Value | null | undefined,
): Decimal {
  const t = dec(total);
  if (t.isZero()) return new Decimal(0);
  return dec(parte).dividedBy(t).times(100).toDecimalPlaces(2);
}

/** Arredonda para 2 casas (padrão monetário). */
export function money(valor: Decimal.Value | null | undefined): Decimal {
  return dec(valor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

const FORMATADOR_BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatarBRL(valor: Decimal.Value | null | undefined): string {
  return FORMATADOR_BRL.format(dec(valor).toNumber());
}

const FORMATADOR_PCT = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatarPercentual(valor: Decimal.Value | null | undefined): string {
  return `${FORMATADOR_PCT.format(dec(valor).toNumber())}%`;
}
