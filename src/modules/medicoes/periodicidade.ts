import { PeriodicidadeMedicao, StatusObra } from "@/generated/prisma/enums";
import { adicionarDias, diasEntre } from "@/lib/date-br";
import {
  diasSuspensosAteHoje,
  diasSuspensosDesde,
  type Suspensao,
} from "@/modules/obras/suspensao";

/**
 * Ritmo das medições e vencimento da próxima.
 *
 * O mockup traz "Última medição" e "Próxima medição" em cada cartão do painel,
 * um indicador "Medições atrasadas" e uma legenda de farol inteiramente escrita
 * em cima disso ("Próxima medição dentro do prazo", "Medição próxima", "Medição
 * vencida"). Nada disso é calculável sem saber de quanto em quanto tempo se
 * mede — daí o campo `periodicidadeMedicao` na obra.
 *
 * O padrão é mensal porque é o que o mockup mostra selecionado e o que a
 * medição de contrato público costuma ser. É suposição, não regra confirmada:
 * ver `docs/pontos-para-reuniao.md`, ponto #13.
 */
export const PERIODICIDADES = [
  PeriodicidadeMedicao.MENSAL,
  PeriodicidadeMedicao.QUINZENAL,
  PeriodicidadeMedicao.SEMANAL,
  PeriodicidadeMedicao.PERSONALIZADA,
] as const;

export const ROTULOS_PERIODICIDADE: Record<PeriodicidadeMedicao, string> = {
  MENSAL: "Mensal",
  QUINZENAL: "Quinzenal",
  SEMANAL: "Semanal",
  PERSONALIZADA: "Personalizada",
};

const DIAS_FIXOS: Record<PeriodicidadeMedicao, number | null> = {
  MENSAL: 30,
  QUINZENAL: 15,
  SEMANAL: 7,
  PERSONALIZADA: null,
};

/**
 * Intervalo em dias entre uma medição e a seguinte. `null` quando a obra está
 * marcada como personalizada e ninguém preencheu o intervalo — caso em que o
 * sistema não inventa um prazo.
 */
export function intervaloEmDias(
  periodicidade: PeriodicidadeMedicao,
  intervaloMedicaoDias: number | null | undefined,
): number | null {
  if (periodicidade === PeriodicidadeMedicao.PERSONALIZADA) {
    return intervaloMedicaoDias && intervaloMedicaoDias > 0
      ? intervaloMedicaoDias
      : null;
  }
  return DIAS_FIXOS[periodicidade];
}

export type EntradaProximaMedicao = {
  status: StatusObra;
  periodicidadeMedicao: PeriodicidadeMedicao;
  intervaloMedicaoDias: number | null;
  dataOrdemInicio: Date | null;
  /** Data da medição mais recente já lançada, ou `null` se não houver nenhuma. */
  ultimaMedicaoEm: Date | null;
  /** Suspensões de prazo da obra — elas param o ciclo também. */
  suspensoes?: Suspensao[];
  agora?: Date;
};

export type SituacaoMedicao = {
  ultima: Date | null;
  proxima: Date;
  /** Negativo quando já venceu. */
  diasRestantes: number;
  atrasada: boolean;
};

/**
 * Quando a próxima medição vence.
 *
 * Conta a partir da última medição lançada; sem nenhuma, conta da ordem de
 * início — é o primeiro momento em que passa a existir obra para medir.
 *
 * Suspensão de prazo para o ciclo (24/09/2026: *"com a suspensão para de
 * contar tudo, que seria o prazo e medições"*): os dias suspensos depois da
 * base empurram o vencimento, com a mesma regra do prazo contratual — ver
 * `modules/obras/suspensao.ts`. Sem isso, obra suspensa ficaria vermelha por
 * medição vencida sem ter como medir.
 *
 * Devolve `null` quando não há prazo a cobrar: obra sem ordem de início (não
 * começou), finalizada, cancelada ou paralisada (a pendência ali é outra, e o
 * farol já a sinaliza pelo status), ou periodicidade personalizada sem
 * intervalo informado.
 */
export function proximaMedicao(e: EntradaProximaMedicao): SituacaoMedicao | null {
  const agora = e.agora ?? new Date();

  if (
    e.status === StatusObra.FINALIZADA ||
    e.status === StatusObra.CANCELADA ||
    e.status === StatusObra.PARALISADA
  ) {
    return null;
  }

  const dias = intervaloEmDias(e.periodicidadeMedicao, e.intervaloMedicaoDias);
  if (dias === null) return null;

  const base = e.ultimaMedicaoEm ?? e.dataOrdemInicio;
  if (!base) return null;

  const suspensoes = e.suspensoes ?? [];
  const proxima = adicionarDias(base, dias + diasSuspensosDesde(suspensoes, base, agora));
  // Dias do ciclo que faltam, descontada a suspensão já vivida — mesmo motivo
  // de `Prazo.diasRestantes`: parado durante a suspensão, e sem pular quando
  // alguém preenche a data final no meio dela.
  const diasRestantes =
    dias - (diasEntre(base, agora) - diasSuspensosAteHoje(suspensoes, base, agora));

  return {
    ultima: e.ultimaMedicaoEm,
    proxima,
    diasRestantes,
    atrasada: diasRestantes < 0,
  };
}
