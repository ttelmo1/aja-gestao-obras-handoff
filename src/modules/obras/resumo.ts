import { Decimal as DecimalCtor } from "decimal.js";
import type { Decimal } from "decimal.js";

import type {
  Farol,
  PeriodicidadeMedicao,
  StatusObra,
} from "@/generated/prisma/enums";
import { calcularFarol } from "@/modules/farol/regras";
import {
  dataDeReferencia,
  resumoFinanceiro,
  type MedicaoParaCalculo,
  type ResumoFinanceiro,
} from "@/modules/medicoes/calculos";
import {
  proximaMedicao,
  type SituacaoMedicao,
} from "@/modules/medicoes/periodicidade";

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
  periodicidadeMedicao: PeriodicidadeMedicao;
  intervaloMedicaoDias: number | null;
};

export type ResumoObra = {
  financeiro: ResumoFinanceiro;
  prazo: Prazo | null;
  /** Vencimento da próxima medição; `null` quando não há prazo a cobrar. */
  medicao: SituacaoMedicao | null;
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

  // A lista chega ordenada por competência, mas não custa não depender disso:
  // o resumo é chamado de lugares diferentes.
  const ultimaMedicaoEm = medicoes.reduce<Date | null>((maior, m) => {
    const d = dataDeReferencia(m);
    return maior === null || d > maior ? d : maior;
  }, null);

  const medicao = proximaMedicao({
    status: obra.status,
    periodicidadeMedicao: obra.periodicidadeMedicao,
    intervaloMedicaoDias: obra.intervaloMedicaoDias,
    dataOrdemInicio: obra.dataOrdemInicio,
    ultimaMedicaoEm,
    agora,
  });

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

  return { financeiro, prazo, medicao, farol, motivosFarol: motivos };
}

export type TotaisPainel = {
  quantidade: number;
  emAndamento: number;
  valorContratado: Decimal;
  valorMedido: Decimal;
  saldoAMedir: Decimal;
  /** Obras cuja próxima medição já venceu — o KPI do mockup. */
  medicoesAtrasadas: number;
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
    medicoesAtrasadas: obras.filter((o) => o.resumo.medicao?.atrasada).length,
  };
}
