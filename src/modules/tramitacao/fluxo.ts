import { TipoEtapa } from "@/generated/prisma/enums";

/**
 * Sequência FIXA do fluxo de tramitação (requisitos.md 1.5).
 *
 * Decisão de escopo confirmada com o engenheiro do cliente: a ordem é sempre a
 * mesma, independente do contratante. O que varia entre contratos é a AUSÊNCIA
 * de uma etapa — marcada como NAO_SE_APLICA —, nunca a ordem.
 *
 * Não transformar isto em tabela configurável nem em builder de fluxo.
 */
export const FLUXO_FIXO = [
  TipoEtapa.BUSCA_LICITACAO,
  TipoEtapa.HABILITACAO_HOMOLOGACAO,
  TipoEtapa.ASSINATURA_CONTRATO,
  TipoEtapa.GARANTIA,
  TipoEtapa.ORDEM_INICIO,
  TipoEtapa.EXECUCAO_OBRA,
  TipoEtapa.MEDICOES,
  TipoEtapa.RERRATIFICACAO,
  TipoEtapa.FINALIZACAO,
  TipoEtapa.ACEITE,
  TipoEtapa.ATESTADO,
] as const;

export const ROTULOS_ETAPA: Record<TipoEtapa, string> = {
  BUSCA_LICITACAO: "Busca em plataforma de licitação",
  HABILITACAO_HOMOLOGACAO: "Habilitação / classificação / homologação",
  ASSINATURA_CONTRATO: "Assinatura de contrato",
  GARANTIA: "Garantia",
  ORDEM_INICIO: "Ordem de início",
  EXECUCAO_OBRA: "Execução da obra",
  MEDICOES: "Medições",
  RERRATIFICACAO: "Rerratificação",
  FINALIZACAO: "Finalização",
  ACEITE: "Aceite",
  ATESTADO: "Atestado",
};

/** Posição 1-based da etapa no fluxo — é o valor gravado em EtapaObra.ordem. */
export function ordemDaEtapa(tipo: TipoEtapa): number {
  const i = FLUXO_FIXO.indexOf(tipo as (typeof FLUXO_FIXO)[number]);
  if (i < 0) throw new Error(`Etapa fora do fluxo fixo: ${tipo}`);
  return i + 1;
}

/**
 * As 11 etapas que toda obra recebe na criação, já ordenadas.
 * RERRATIFICACAO nasce como as demais; quem não tiver aditivo marca
 * "não se aplica".
 */
export function etapasIniciais(): Array<{ tipo: TipoEtapa; ordem: number }> {
  return FLUXO_FIXO.map((tipo, i) => ({ tipo, ordem: i + 1 }));
}
