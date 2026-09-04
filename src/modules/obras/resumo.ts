import { Decimal as DecimalCtor } from "decimal.js";
import type { Decimal } from "decimal.js";

import type { Farol, StatusObra } from "@/generated/prisma/enums";
import { calcularFarol } from "@/modules/farol/regras";
import {
  resumoFinanceiro,
  type MedicaoParaCalculo,
  type ResumoFinanceiro,
} from "@/modules/medicoes/calculos";

import { prazoTranscorrido, type Prazo } from "./prazo";

/**
 * Tudo que o painel e a aba Resumo mostram sobre uma obra, num lugar só.
 *
 * Reúne o que já existia — cálculo financeiro (etapa 0) e motor do farol
 * (etapa 0) — e acrescenta o prazo. Fica em `modules/` e sem React porque é
 * a mesma conta que o relatório da etapa 11 vai precisar.
 */
export type ObraParaResumo = {
  status: StatusObra;
  valorContratado: Decimal | string | number;
  valorAditivado: Decimal | string | number;
  dataOrdemInicio: Date | null;
  dataPrevistaTermino: Date | null;
};

export type ResumoObra = {
  financeiro: ResumoFinanceiro;
  prazo: Prazo | null;
  farol: Farol;
  motivosFarol: string[];
};

export function resumoDaObra(
  obra: ObraParaResumo,
  medicoes: MedicaoParaCalculo[] = [],
  /** Dias parada no setor atual. `null` até a tramitação existir (etapa 6). */
  diasParado: number | null = null,
  agora: Date = new Date(),
): ResumoObra {
  const financeiro = resumoFinanceiro(
    obra.valorContratado,
    obra.valorAditivado,
    medicoes,
  );
  const prazo = prazoTranscorrido(
    obra.dataOrdemInicio,
    obra.dataPrevistaTermino,
    agora,
  );

  const { farol, motivos } = calcularFarol({
    status: obra.status,
    dataOrdemInicio: obra.dataOrdemInicio,
    dataPrevistaTermino: obra.dataPrevistaTermino,
    // Sem medição não há avanço físico informado. Zero seria mentira — diria
    // "0% executado" e acenderia o alerta de atraso numa obra recém-iniciada.
    percentualExecutado:
      financeiro.quantidadeMedicoes > 0
        ? financeiro.percentualExecutado.toNumber()
        : null,
    diasParado,
    agora,
  });

  return { financeiro, prazo, farol, motivosFarol: motivos };
}

export type TotaisPainel = {
  quantidade: number;
  emAndamento: number;
  valorContratado: Decimal;
  valorMedido: Decimal;
  saldoAMedir: Decimal;
};

/**
 * Somatórios dos indicadores do painel, sobre as obras que sobraram do
 * filtro. Fica aqui, e não na página, para o relatório da etapa 11 somar
 * exatamente do mesmo jeito — indicador que diverge entre a tela e o PDF é
 * problema que só aparece na frente do cliente.
 */
export function totaisDoPainel(
  obras: Array<{ status: StatusObra; resumo: ResumoObra }>,
): TotaisPainel {
  const zero = new DecimalCtor(0);
  return {
    quantidade: obras.length,
    emAndamento: obras.filter((o) => o.status === "EM_ANDAMENTO").length,
    valorContratado: obras.reduce(
      (s, o) => s.plus(o.resumo.financeiro.valorContratadoAtual),
      zero,
    ),
    valorMedido: obras.reduce(
      (s, o) => s.plus(o.resumo.financeiro.valorMedidoTotal),
      zero,
    ),
    saldoAMedir: obras.reduce((s, o) => s.plus(o.resumo.financeiro.saldoAMedir), zero),
  };
}
