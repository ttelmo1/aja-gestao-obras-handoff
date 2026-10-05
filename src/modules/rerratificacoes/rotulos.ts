import { StatusRerratificacao } from "@/generated/prisma/enums";

export const STATUS_RERRATIFICACAO = [
  StatusRerratificacao.EM_ELABORACAO,
  StatusRerratificacao.PROTOCOLADA,
  StatusRerratificacao.APROVADA,
  StatusRerratificacao.REJEITADA,
] as const;

export const ROTULOS_STATUS_RERRATIFICACAO: Record<StatusRerratificacao, string> = {
  EM_ELABORACAO: "Em elaboração",
  PROTOCOLADA: "Protocolada",
  APROVADA: "Aprovada",
  REJEITADA: "Rejeitada",
};

/** Mesma paleta do badge de medição: só a aprovada é verde. */
export const CORES_STATUS_RERRATIFICACAO: Record<
  StatusRerratificacao,
  { fundo: string; texto: string }
> = {
  EM_ELABORACAO: { fundo: "#eef2f5", texto: "var(--muted)" },
  PROTOCOLADA: { fundo: "#e8f0fa", texto: "var(--blue)" },
  APROVADA: { fundo: "var(--success-bg)", texto: "var(--success)" },
  REJEITADA: { fundo: "var(--danger-bg)", texto: "var(--danger)" },
};
