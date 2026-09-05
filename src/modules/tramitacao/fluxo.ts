import { StatusEtapa, TipoEtapa } from "@/generated/prisma/enums";

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

export const STATUS_ETAPA = [
  StatusEtapa.PENDENTE,
  StatusEtapa.EM_ANDAMENTO,
  StatusEtapa.CONCLUIDA,
  StatusEtapa.NAO_SE_APLICA,
] as const;

export const ROTULOS_STATUS_ETAPA: Record<StatusEtapa, string> = {
  PENDENTE: "Pendente",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
  NAO_SE_APLICA: "Não se aplica",
};

/**
 * Cores do passo no fluxo, nos tokens do mockup: concluído em verde, atual em
 * navio, pendente apagado. "Não se aplica" fica riscado e cinza — precisa
 * continuar visível para o usuário saber que a etapa foi considerada e
 * dispensada, não esquecida.
 */
export const CORES_STATUS_ETAPA: Record<
  StatusEtapa,
  { fundo: string; texto: string; borda: string }
> = {
  PENDENTE: { fundo: "var(--surface)", texto: "var(--muted)", borda: "var(--border)" },
  EM_ANDAMENTO: { fundo: "#eef4fb", texto: "var(--primary)", borda: "var(--primary)" },
  CONCLUIDA: { fundo: "var(--success-bg)", texto: "var(--success)", borda: "var(--success)" },
  NAO_SE_APLICA: { fundo: "#f2f4f6", texto: "var(--muted)", borda: "var(--border)" },
};

/** Etapa que ainda espera alguém. Usada para achar "a etapa atual" da obra. */
export function estaAberta(status: StatusEtapa): boolean {
  return status === StatusEtapa.PENDENTE || status === StatusEtapa.EM_ANDAMENTO;
}
