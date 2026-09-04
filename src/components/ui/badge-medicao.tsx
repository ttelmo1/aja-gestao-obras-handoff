import type { StatusMedicao } from "@/generated/prisma/enums";
import {
  CORES_STATUS_MEDICAO,
  ROTULOS_STATUS_MEDICAO,
} from "@/modules/medicoes/rotulos";

/** Situação da medição. Como no farol, a cor nunca vem sozinha. */
export function BadgeMedicao({ status }: { status: StatusMedicao }) {
  const cor = CORES_STATUS_MEDICAO[status];
  return (
    <span
      className="inline-block rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap"
      style={{ background: cor.fundo, color: cor.texto }}
    >
      {ROTULOS_STATUS_MEDICAO[status]}
    </span>
  );
}
