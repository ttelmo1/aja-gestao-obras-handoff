import { Farol, StatusObra } from "@/generated/prisma/enums";
import { diasEntre } from "@/lib/date-br";

/**
 * Motor do farol (requisitos.md 1.3).
 *
 * ESCOPO CONFIRMADO pelo engenheiro do cliente em 07/09/2026: o farol é sobre
 * a obra inteira, não sobre o prazo da medição, e **basta um critério** para
 * acender — "qualquer problema, porque aí chama a atenção e o responsável
 * trabalha em cima". São três faixas mais o cinza: amarelo é atenção, vermelho
 * é urgência, cinza é neutro (obra que ainda não começou).
 *
 * O critério de avanço físico contra tempo decorrido SAIU em 09/09/2026: o
 * dado deixou de existir no sistema (requisitos.md 1.4). No lugar dele entrou
 * o PRAZO DA PRÓXIMA MEDIÇÃO, e este é o único limite que o cliente fechou com
 * número: **amarelo dez dias antes do vencimento**, vermelho quando vencer.
 * Confirmado duas vezes na mesma conversa.
 *
 * O critério de PROCESSO PARADO NUM SETOR saiu em 17/09/2026, junto com a
 * tramitação (ver docs/pontos-para-reuniao.md, ponto #23). Ele lia o movimento
 * sem data de saída; sem tela que registre movimento, o dado não existe mais.
 * Decisão do cliente: o farol fica com dois critérios em vez de inventar um
 * substituto — "sem documento novo há N dias" mede outra coisa e usaria o
 * mesmo nome. **O que se perde:** obra parada, dentro do prazo e com medição
 * em dia agora fica verde. O farol passa a ser alerta de prazo, não de
 * andamento.
 *
 * O LIMITE DE PRAZO CONTINUA PROVISÓRIO. Ele confirmou a lógica, não o número
 * de dias. Calibrar com a tela aberta.
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
  /**
   * Dias de antecedência do vencimento da medição em que a obra passa a
   * AMARELO. **Não é provisório**: número dado pelo cliente em 09/09/2026.
   * Numa obra mensal (30 dias corridos), acende a partir do 20º dia.
   */
  diasAlertaMedicao: 10,
} as const;

export type EntradaFarol = {
  status: StatusObra;
  dataOrdemInicio: Date | null;
  dataPrevistaTermino: Date | null;
  /**
   * Dias até o vencimento da próxima medição, negativo quando já venceu.
   * `null` quando não há prazo a cobrar — obra sem ordem de início,
   * finalizada, ou periodicidade personalizada sem intervalo.
   * Vem de `modules/medicoes/periodicidade.ts`.
   */
  diasParaMedicao: number | null;
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
   * vermelha por medição vencida *e* prazo apertado, mostrar "faltam 12 dias
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

  // 2. Prazo da próxima medição.
  if (e.diasParaMedicao !== null) {
    if (e.diasParaMedicao < 0) {
      subir(2, `Medição vencida há ${Math.abs(e.diasParaMedicao)} dia(s).`);
    } else if (e.diasParaMedicao <= LIMITES_PROVISORIOS.diasAlertaMedicao) {
      subir(1, `Medição vence em ${e.diasParaMedicao} dia(s).`);
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

export const ROTULOS_FAROL: Record<Farol, string> = {
  VERDE: "Em dia",
  AMARELO: "Atenção",
  VERMELHO: "Crítico",
  // Cobre dois casos — obra sem ordem de início e obra cancelada —, então não
  // pode ser "Não iniciada". "Sem dados" descrevia o sistema, não a obra.
  CINZA: "Não avaliada",
};

