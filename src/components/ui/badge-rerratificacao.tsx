import type { StatusRerratificacao } from "@/generated/prisma/enums";
import {
  CORES_STATUS_RERRATIFICACAO,
  ROTULOS_STATUS_RERRATIFICACAO,
} from "@/modules/rerratificacoes/rotulos";

/** Situação da rerratificação. A cor nunca vem sozinha. */
export function BadgeRerratificacao({ status }: { status: StatusRerratificacao }) {
  const cor = CORES_STATUS_RERRATIFICACAO[status];
  return (
    <span
      className="inline-block rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap"
      style={{ background: cor.fundo, color: cor.texto }}
    >
      {ROTULOS_STATUS_RERRATIFICACAO[status]}
    </span>
  );
}
