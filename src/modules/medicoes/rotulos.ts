import { StatusMedicao } from "@/generated/prisma/enums";

export const STATUS_MEDICAO = [
  StatusMedicao.RASCUNHO,
  StatusMedicao.PROTOCOLADA,
  StatusMedicao.APROVADA,
  StatusMedicao.PAGA,
  StatusMedicao.REJEITADA,
] as const;

export const ROTULOS_STATUS_MEDICAO: Record<StatusMedicao, string> = {
  RASCUNHO: "Rascunho",
  PROTOCOLADA: "Protocolada",
  APROVADA: "Aprovada",
  PAGA: "Paga",
  REJEITADA: "Rejeitada",
};

/**
 * Cores do badge, nos tokens do mockup. A palavra vem sempre escrita junto —
 * a cor nunca é o único sinal.
 */
export const CORES_STATUS_MEDICAO: Record<
  StatusMedicao,
  { fundo: string; texto: string }
> = {
  RASCUNHO: { fundo: "#eef2f5", texto: "var(--muted)" },
  PROTOCOLADA: { fundo: "#e8f0fa", texto: "var(--blue)" },
  APROVADA: { fundo: "var(--success-bg)", texto: "var(--success)" },
  PAGA: { fundo: "var(--success-bg)", texto: "var(--success)" },
  REJEITADA: { fundo: "var(--danger-bg)", texto: "var(--danger)" },
};

/**
 * Medição que ainda conta como pendência no processo. `PAGA` encerrou o ciclo
 * e `REJEITADA` saiu dele — nenhuma das duas está aguardando alguém.
 */
export function emAndamento(status: StatusMedicao): boolean {
  return (
    status === StatusMedicao.RASCUNHO ||
    status === StatusMedicao.PROTOCOLADA ||
    status === StatusMedicao.APROVADA
  );
}
