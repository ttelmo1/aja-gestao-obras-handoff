import { adicionarDias, diasEntre } from "@/lib/date-br";

/**
 * Prazo contratual da obra.
 *
 * O contrato dá duas informações redundantes — prazo em dias e data prevista
 * de término — e elas divergem na prática, porque a contagem começa na ordem
 * de início, que sai depois da assinatura. Aqui a data prevista é **derivada**
 * da ordem de início mais o prazo; o campo no banco guarda o resultado para
 * consulta e para o cliente poder corrigir à mão quando houver suspensão de
 * prazo (algo que o sistema ainda não modela — ver etapa 6).
 */
export function terminoPrevisto(
  dataOrdemInicio: Date | null,
  prazoDias: number | null,
): Date | null {
  if (!dataOrdemInicio || prazoDias === null || prazoDias <= 0) return null;
  return adicionarDias(dataOrdemInicio, prazoDias);
}

export type Prazo = {
  /** Quanto do prazo já passou, 0–100. Passa de 100 quando está vencido. */
  percentualTranscorrido: number;
  diasTotais: number;
  diasDecorridos: number;
  /** Negativo quando o prazo venceu. */
  diasRestantes: number;
  vencido: boolean;
};

/**
 * Andamento do prazo. Devolve `null` quando falta data — obra em
 * planejamento, sem ordem de início, não tem prazo transcorrido, e mostrar
 * 0% ali sugeriria que o relógio já está correndo.
 */
export function prazoTranscorrido(
  dataOrdemInicio: Date | null,
  dataPrevistaTermino: Date | null,
  agora: Date = new Date(),
): Prazo | null {
  if (!dataOrdemInicio || !dataPrevistaTermino) return null;

  const diasTotais = diasEntre(dataOrdemInicio, dataPrevistaTermino);
  if (diasTotais <= 0) return null;

  const diasDecorridos = diasEntre(dataOrdemInicio, agora);
  const diasRestantes = diasEntre(agora, dataPrevistaTermino);
  const bruto = (diasDecorridos / diasTotais) * 100;

  return {
    // Antes da ordem de início o percentual seria negativo; travamos em 0.
    percentualTranscorrido: Math.max(0, Math.round(bruto)),
    diasTotais,
    diasDecorridos,
    diasRestantes,
    vencido: diasRestantes < 0,
  };
}
