import { Decimal } from "decimal.js";

import { dec, money, percentual, somar } from "@/lib/money";
import { StatusRerratificacao } from "@/generated/prisma/enums";

/**
 * Impacto agregado das rerratificações (requisitos.md 1.7 `[AJUSTADO]`).
 *
 * O sistema não guarda item alterado: o detalhamento vive na planilha Excel
 * apresentada ao órgão, que fica anexada como documento. Aqui só entra o
 * resultado — percentual alcançado e valor impactado.
 *
 * `Obra.valorAditivado` é cache disto, na mesma divisão de papéis da coluna
 * `farol`: quem manda é esta função, a coluna existe para consulta direta ao
 * banco e é reescrita a cada alteração.
 */
export type RerratificacaoParaCalculo = {
  status: StatusRerratificacao;
  valorImpactado: Decimal | string | number;
  prazoAdicionalDias?: number | null;
};

export type ImpactoRerratificacoes = {
  /** Soma do valor das aprovadas. Pode ser negativo (supressão). */
  valorAprovado: Decimal;
  /** Soma das que ainda tramitam — o que pode entrar, mas ainda não entrou. */
  valorEmAndamento: Decimal;
  prazoAdicionalDias: number;
  quantidadeAprovadas: number;
  quantidadeEmAndamento: number;
};

/**
 * Só a rerratificação **aprovada** mexe no valor do contrato.
 *
 * Uma que está em elaboração ou protocolada ainda pode ser negada, e somá-la
 * inflaria o contrato com dinheiro que talvez nunca exista — o saldo a medir
 * ficaria maior do que a obra tem direito a receber. Ela aparece à parte,
 * como expectativa.
 */
export function impactoDasRerratificacoes(
  rerratificacoes: RerratificacaoParaCalculo[],
): ImpactoRerratificacoes {
  const aprovadas = rerratificacoes.filter(
    (r) => r.status === StatusRerratificacao.APROVADA,
  );
  const emAndamento = rerratificacoes.filter(
    (r) =>
      r.status === StatusRerratificacao.EM_ELABORACAO ||
      r.status === StatusRerratificacao.PROTOCOLADA,
  );

  return {
    valorAprovado: money(somar(...aprovadas.map((r) => r.valorImpactado))),
    valorEmAndamento: money(somar(...emAndamento.map((r) => r.valorImpactado))),
    prazoAdicionalDias: aprovadas.reduce(
      (s, r) => s + (r.prazoAdicionalDias ?? 0),
      0,
    ),
    quantidadeAprovadas: aprovadas.length,
    quantidadeEmAndamento: emAndamento.length,
  };
}

/**
 * Limite legal de acréscimo sobre o valor original do contrato.
 *
 * A Lei 14.133/2021, art. 125, permite acréscimos e supressões de até 25% —
 * 50% no caso de reforma de edifício ou equipamento. O sistema usa 25% como
 * alerta, **não como trava**: quem decide se o caso é de 50%, ou se há
 * fundamento para exceder, é o jurídico do cliente, não este código.
 *
 * Confirmar na reunião — ponto #17.
 */
export const LIMITE_ACRESCIMO_PERCENTUAL = 25;

export type PercentualAcumulado = {
  /**
   * Variação acumulada sobre o valor ORIGINAL, em percentual. Negativa quando
   * as supressões superam os acréscimos.
   */
  percentual: Decimal;
  /** Passou do limite de alerta, para qualquer um dos dois lados? */
  excedeLimite: boolean;
};

/**
 * Quanto o contrato variou, em percentual do valor original.
 *
 * A conta é sobre o valor original de propósito: é assim que o limite legal
 * é medido. Calcular sobre o valor já aditivado deixaria cada novo aditivo
 * parecer menor que o anterior, e o teto nunca chegaria.
 */
export function percentualAcumulado(
  valorContratadoOriginal: Decimal | string | number,
  valorAprovado: Decimal | string | number,
): PercentualAcumulado {
  const original = dec(valorContratadoOriginal);
  if (original.isZero()) {
    return { percentual: new Decimal(0), excedeLimite: false };
  }
  const pct = percentual(valorAprovado, original);
  // Compara em módulo: a lei fala em "acréscimos e supressões" de até 25%, e
  // `valorAprovado` é negativo quando as supressões pesam mais. Sem o `abs`,
  // uma supressão de 40% não acenderia alerta nenhum — -40 não é maior que 25.
  return {
    percentual: pct,
    excedeLimite: pct.abs().gt(LIMITE_ACRESCIMO_PERCENTUAL),
  };
}

/** Próximo número da sequência de rerratificações da obra. */
export function proximoNumeroRerratificacao(numerosExistentes: number[]): number {
  return numerosExistentes.reduce((max, n) => Math.max(max, n), 0) + 1;
}
