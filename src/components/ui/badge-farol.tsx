import { Farol } from "@/generated/prisma/enums";
import { ROTULOS_FAROL } from "@/modules/farol/regras";

/**
 * Farol de status. A cor nunca é o único sinal — vem sempre com o rótulo
 * escrito, porque parte dos usuários não é técnica e daltonismo é comum.
 *
 * As cores são as do mockup (`--green`, `--yellow`, `--red`). O mockup ainda
 * define um laranja, usado lá numa faixa intermediária; o enum tem só quatro
 * valores, então o laranja fica reservado até o cliente fechar os critérios
 * do farol (`docs/pontos-para-reuniao.md`, ponto 1).
 */
const CORES: Record<Farol, { ponto: string; fundo: string; texto: string }> = {
  VERDE: {
    ponto: "var(--green)",
    fundo: "var(--success-bg)",
    texto: "var(--green)",
  },
  AMARELO: {
    ponto: "var(--yellow)",
    fundo: "var(--warning-bg)",
    texto: "var(--warning-fg)",
  },
  VERMELHO: {
    ponto: "var(--red)",
    fundo: "var(--danger-bg)",
    texto: "var(--red)",
  },
  CINZA: { ponto: "#9da9b4", fundo: "#eef2f5", texto: "var(--muted)" },
};

export function BadgeFarol({
  farol,
  titulo,
}: {
  farol: Farol;
  /** Motivos do cálculo, exibidos no hover. */
  titulo?: string;
}) {
  const cor = CORES[farol];
  return (
    <span
      title={titulo}
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={{ background: cor.fundo, color: cor.texto }}
    >
      <span
        aria-hidden
        className="size-2 rounded-full"
        style={{ background: cor.ponto }}
      />
      {ROTULOS_FAROL[farol]}
    </span>
  );
}
