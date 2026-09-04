import { Farol } from "@/generated/prisma/enums";
import { ROTULOS_FAROL } from "@/modules/farol/regras";

/**
 * Farol de status. A cor nunca é o único sinal — vem sempre com o rótulo
 * escrito, porque parte dos usuários não é técnica e daltonismo é comum.
 */
const ESTILOS: Record<Farol, string> = {
  VERDE: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  AMARELO: "bg-amber-50 text-amber-900 ring-amber-600/30",
  VERMELHO: "bg-red-50 text-red-800 ring-red-600/20",
  CINZA: "bg-slate-100 text-slate-700 ring-slate-500/20",
};

const PONTOS: Record<Farol, string> = {
  VERDE: "bg-emerald-500",
  AMARELO: "bg-amber-500",
  VERMELHO: "bg-red-500",
  CINZA: "bg-slate-400",
};

export function BadgeFarol({
  farol,
  titulo,
}: {
  farol: Farol;
  /** Motivos do cálculo, exibidos no hover. */
  titulo?: string;
}) {
  return (
    <span
      title={titulo}
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${ESTILOS[farol]}`}
    >
      <span className={`size-1.5 rounded-full ${PONTOS[farol]}`} />
      {ROTULOS_FAROL[farol]}
    </span>
  );
}
