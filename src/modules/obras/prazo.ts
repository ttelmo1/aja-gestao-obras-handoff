import { adicionarDias, diasEntre } from "@/lib/date-br";

import {
  diasSuspensosAteHoje,
  diasSuspensosDesde,
  type Suspensao,
} from "./suspensao";

/**
 * Prazo contratual da obra.
 *
 * O contrato dá duas informações redundantes — prazo em dias e data prevista
 * de término — e elas divergem na prática, porque a contagem começa na ordem
 * de início, que sai depois da assinatura. Aqui a data prevista é **derivada**
 * da ordem de início mais o prazo; o campo no banco guarda o resultado para
 * consulta e para o cliente poder corrigir à mão. Suspensão de prazo não
 * entra aqui: desde 24/09/2026 ela tem registro próprio e é somada no término
 * vigente (`modules/obras/suspensao.ts`).
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
 * rerratificações já aprovadas, mais os dias de suspensão.
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
 *
 * Os dias de suspensão vêm de `diasSuspensosDesde`, contados da ordem de
 * início. Enquanto a suspensão está aberta, eles crescem um por dia e o
 * término anda junto — é o "tudo para" do cliente.
 */
export function terminoVigente(
  dataPrevistaTermino: Date | null,
  prazoAditivadoDias: number = 0,
  diasSuspensos: number = 0,
): Date | null {
  if (!dataPrevistaTermino) return null;
  const extra = Math.max(0, prazoAditivadoDias) + Math.max(0, diasSuspensos);
  if (extra === 0) return dataPrevistaTermino;
  return adicionarDias(dataPrevistaTermino, extra);
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
  /** Dias de suspensão que empurraram o término. */
  diasSuspensos: number;
  /** Contrato assinado — o que a tela mostra como "Término previsto". */
  terminoPrevistoContrato: Date;
  /** Previsto + prorrogação + suspensão: a data contra a qual tudo aqui é medido. */
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
 *
 * A suspensão é diferente: ela **não** aumenta o prazo, só o pausa. Os dias
 * suspensos saem dos decorridos e não entram no total, para o percentual e os
 * dias restantes ficarem parados enquanto a obra está suspensa e voltarem a
 * andar na retomada.
 */
export function prazoTranscorrido(
  dataOrdemInicio: Date | null,
  dataPrevistaTermino: Date | null,
  agora: Date = new Date(),
  prazoAditivadoDias: number = 0,
  suspensoes: Suspensao[] = [],
): Prazo | null {
  if (!dataOrdemInicio || !dataPrevistaTermino) return null;

  const diasSuspensos = diasSuspensosDesde(suspensoes, dataOrdemInicio, agora);
  // `?? dataPrevistaTermino` só existe para o TypeScript: a data já foi
  // checada acima, e `terminoVigente` só devolve nulo quando ela é nula.
  const vigente =
    terminoVigente(dataPrevistaTermino, prazoAditivadoDias, diasSuspensos) ??
    dataPrevistaTermino;

  const diasTotais = diasEntre(dataOrdemInicio, vigente) - diasSuspensos;
  if (diasTotais <= 0) return null;

  const diasDecorridos =
    diasEntre(dataOrdemInicio, agora) -
    diasSuspensosAteHoje(suspensoes, dataOrdemInicio, agora);
  // Dias de prazo, não de calendário: com suspensão já lançada com data
  // final, o término vigente fica lá na frente, mas o que falta de prazo é o
  // que não foi consumido — e fica parado enquanto a obra está suspensa. Sem
  // suspensão, os dois números são o mesmo.
  const diasRestantes = diasTotais - diasDecorridos;
  const bruto = (diasDecorridos / diasTotais) * 100;

  return {
    // Antes da ordem de início o percentual seria negativo; travamos em 0.
    percentualTranscorrido: Math.max(0, Math.round(bruto)),
    diasTotais,
    diasDecorridos,
    diasRestantes,
    vencido: diasRestantes < 0,
    prazoAditivadoDias: Math.max(0, prazoAditivadoDias),
    diasSuspensos,
    terminoPrevistoContrato: dataPrevistaTermino,
    terminoVigente: vigente,
  };
}
