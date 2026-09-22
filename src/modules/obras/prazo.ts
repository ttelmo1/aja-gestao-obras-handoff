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

/**
 * Término que vale hoje: o do contrato assinado mais o prazo adicional das
 * rerratificações já aprovadas.
 *
 * Existe porque `dataPrevistaTermino` **não** é reescrita quando um aditivo
 * prorroga a obra — pedido do cliente em 22/09/2026: "mas não alterar o
 * contrato". O contrato guarda o que foi assinado; a prorrogação é derivada,
 * e some sozinha se a rerratificação sair de aprovada.
 *
 * Só conta prazo de rerratificação APROVADA, mesma regra do valor: a que
 * ainda tramita pode ser negada, e contá-la daria por prorrogada uma obra que
 * talvez vença na data original. Quem faz esse recorte é
 * `impactoDasRerratificacoes`, e o resultado chega aqui pela coluna cache
 * `Obra.prazoAditivadoDias`.
 */
export function terminoVigente(
  dataPrevistaTermino: Date | null,
  prazoAditivadoDias: number = 0,
): Date | null {
  if (!dataPrevistaTermino) return null;
  if (prazoAditivadoDias <= 0) return dataPrevistaTermino;
  return adicionarDias(dataPrevistaTermino, prazoAditivadoDias);
}

export type Prazo = {
  /** Quanto do prazo já passou, 0–100. Passa de 100 quando está vencido. */
  percentualTranscorrido: number;
  diasTotais: number;
  diasDecorridos: number;
  /** Negativo quando o prazo venceu. */
  diasRestantes: number;
  vencido: boolean;
  /** Dias de prorrogação já aprovados que entraram nesta conta. */
  prazoAditivadoDias: number;
  /** Contrato assinado — o que a tela mostra como "Término previsto". */
  terminoPrevistoContrato: Date;
  /** Previsto + prorrogação: a data contra a qual tudo aqui é medido. */
  terminoVigente: Date;
};

/**
 * Andamento do prazo. Devolve `null` quando falta data — obra em
 * planejamento, sem ordem de início, não tem prazo transcorrido, e mostrar
 * 0% ali sugeriria que o relógio já está correndo.
 *
 * Tudo é medido contra o término **vigente**, não contra o do contrato: o
 * prazo adicional aprovado entra tanto nos dias restantes quanto no total, ou
 * obra prorrogada e em dia apareceria com o percentual passando de 100.
 */
export function prazoTranscorrido(
  dataOrdemInicio: Date | null,
  dataPrevistaTermino: Date | null,
  agora: Date = new Date(),
  prazoAditivadoDias: number = 0,
): Prazo | null {
  if (!dataOrdemInicio || !dataPrevistaTermino) return null;

  // `?? dataPrevistaTermino` só existe para o TypeScript: a data já foi
  // checada acima, e `terminoVigente` só devolve nulo quando ela é nula.
  const vigente =
    terminoVigente(dataPrevistaTermino, prazoAditivadoDias) ?? dataPrevistaTermino;

  const diasTotais = diasEntre(dataOrdemInicio, vigente);
  if (diasTotais <= 0) return null;

  const diasDecorridos = diasEntre(dataOrdemInicio, agora);
  const diasRestantes = diasEntre(agora, vigente);
  const bruto = (diasDecorridos / diasTotais) * 100;

  return {
    // Antes da ordem de início o percentual seria negativo; travamos em 0.
    percentualTranscorrido: Math.max(0, Math.round(bruto)),
    diasTotais,
    diasDecorridos,
    diasRestantes,
    vencido: diasRestantes < 0,
    prazoAditivadoDias: Math.max(0, prazoAditivadoDias),
    terminoPrevistoContrato: dataPrevistaTermino,
    terminoVigente: vigente,
  };
}
