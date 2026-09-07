import { Farol, StatusObra } from "@/generated/prisma/enums";
import { diasDesde, diasEntre } from "@/lib/date-br";

/**
 * Motor do farol (requisitos.md 1.3).
 *
 * ESCOPO CONFIRMADO pelo engenheiro do cliente em 07/09/2026: o farol é sobre
 * a obra inteira, não sobre o prazo da medição, e **basta um critério** para
 * acender — "qualquer problema, porque aí chama a atenção e o responsável
 * trabalha em cima". São três faixas mais o cinza: amarelo é atenção, vermelho
 * é urgência, cinza é neutro (obra que ainda não começou).
 *
 * OS LIMITES CONTINUAM PROVISÓRIOS. Ele confirmou a lógica, não os números —
 * quantos dias de prazo, quantos dias parado, quantos pontos percentuais de
 * atraso. Calibrar na apresentação, com a tela aberta.
 *
 * Todo o resto do sistema consome apenas `calcularFarol`, e o resultado nunca
 * é persistido: obra fica amarela pela passagem do tempo, sem ninguém salvar
 * nada, então coluna cacheada só teria como envelhecer errado.
 *
 * Ver docs/pontos-para-reuniao.md, ponto #1.
 */
export const LIMITES_PROVISORIOS = {
  /** Dias de antecedência do término em que a obra passa a AMARELO. */
  diasAlertaPrazo: 30,
  /** Dias sem movimentação de tramitação até AMARELO. */
  diasParadoAlerta: 15,
  /** Dias sem movimentação de tramitação até VERMELHO. */
  diasParadoCritico: 30,
  /**
   * Distância aceitável entre avanço físico e tempo decorrido do prazo, em
   * pontos percentuais, antes de acender o alerta de execução atrasada.
   */
  desvioExecucaoAlerta: 10,
  desvioExecucaoCritico: 25,
} as const;

export type EntradaFarol = {
  status: StatusObra;
  dataOrdemInicio: Date | null;
  dataPrevistaTermino: Date | null;
  /** Avanço físico acumulado (0–100), da última medição. */
  percentualExecutado: number | null;
  /** Dias desde a entrada no setor atual sem saída registrada. */
  diasParado: number | null;
  agora?: Date;
};

export type ResultadoFarol = {
  farol: Farol;
  /** Motivos legíveis — o usuário precisa saber por que a luz está vermelha. */
  motivos: string[];
  /**
   * O motivo que determinou a cor — o primeiro entre os do pior nível.
   *
   * Existe porque o cartão do painel tem uma linha, não seis: numa obra
   * vermelha por prazo vencido *e* processo parado, mostrar "faltam 12 dias
   * para o término" seria mostrar o motivo errado.
   */
  motivoPrincipal: string | null;
};

export function calcularFarol(e: EntradaFarol): ResultadoFarol {
  const agora = e.agora ?? new Date();
  const motivos: string[] = [];

  if (e.status === StatusObra.FINALIZADA) {
    return {
      farol: Farol.VERDE,
      motivos: ["Obra finalizada."],
      motivoPrincipal: "Obra finalizada.",
    };
  }
  if (e.status === StatusObra.CANCELADA) {
    return {
      farol: Farol.CINZA,
      motivos: ["Obra cancelada."],
      motivoPrincipal: "Obra cancelada.",
    };
  }
  if (e.status === StatusObra.PARALISADA) {
    return {
      farol: Farol.VERMELHO,
      motivos: ["Obra paralisada."],
      motivoPrincipal: "Obra paralisada.",
    };
  }
  if (e.status === StatusObra.PLANEJAMENTO && !e.dataOrdemInicio) {
    return {
      farol: Farol.CINZA,
      motivos: ["Sem ordem de início."],
      motivoPrincipal: "Sem ordem de início.",
    };
  }

  let nivel = 0; // 0 verde, 1 amarelo, 2 vermelho
  const niveis: number[] = [];
  const subir = (n: number, motivo: string) => {
    nivel = Math.max(nivel, n);
    motivos.push(motivo);
    niveis.push(n);
  };

  // 1. Prazo contratual.
  if (e.dataPrevistaTermino) {
    const diasRestantes = diasEntre(agora, e.dataPrevistaTermino);
    if (diasRestantes < 0) {
      subir(2, `Prazo vencido há ${Math.abs(diasRestantes)} dia(s).`);
    } else if (diasRestantes <= LIMITES_PROVISORIOS.diasAlertaPrazo) {
      subir(1, `Faltam ${diasRestantes} dia(s) para o término previsto.`);
    }
  }

  // 2. Processo parado em um setor.
  if (e.diasParado !== null) {
    if (e.diasParado >= LIMITES_PROVISORIOS.diasParadoCritico) {
      subir(2, `Processo parado há ${e.diasParado} dias.`);
    } else if (e.diasParado >= LIMITES_PROVISORIOS.diasParadoAlerta) {
      subir(1, `Processo parado há ${e.diasParado} dias.`);
    }
  }

  // 3. Avanço físico contra tempo decorrido.
  const desvio = desvioExecucao(e, agora);
  if (desvio !== null) {
    if (desvio >= LIMITES_PROVISORIOS.desvioExecucaoCritico) {
      subir(2, `Execução ${desvio} p.p. atrás do previsto pelo prazo.`);
    } else if (desvio >= LIMITES_PROVISORIOS.desvioExecucaoAlerta) {
      subir(1, `Execução ${desvio} p.p. atrás do previsto pelo prazo.`);
    }
  }

  if (motivos.length === 0) {
    motivos.push("Dentro do prazo e sem pendências.");
    niveis.push(0);
  }
  return {
    farol: [Farol.VERDE, Farol.AMARELO, Farol.VERMELHO][nivel],
    motivos,
    motivoPrincipal: motivos[niveis.indexOf(nivel)] ?? null,
  };
}

/**
 * Quantos pontos percentuais o avanço físico está atrás do tempo decorrido.
 * Devolve null quando falta dado para comparar.
 */
function desvioExecucao(e: EntradaFarol, agora: Date): number | null {
  if (
    !e.dataOrdemInicio ||
    !e.dataPrevistaTermino ||
    e.percentualExecutado === null
  ) {
    return null;
  }
  const prazoTotal = diasEntre(e.dataOrdemInicio, e.dataPrevistaTermino);
  if (prazoTotal <= 0) return null;

  const decorrido = diasDesde(e.dataOrdemInicio, agora);
  const percentualEsperado = Math.min(100, (decorrido / prazoTotal) * 100);
  const desvio = percentualEsperado - e.percentualExecutado;
  return desvio > 0 ? Math.round(desvio) : null;
}

export const ROTULOS_FAROL: Record<Farol, string> = {
  VERDE: "Em dia",
  AMARELO: "Atenção",
  VERMELHO: "Crítico",
  // Cobre dois casos — obra sem ordem de início e obra cancelada —, então não
  // pode ser "Não iniciada". "Sem dados" descrevia o sistema, não a obra.
  CINZA: "Não avaliada",
};

