import { Farol } from "@/generated/prisma/enums";
import { ROTULOS_FAROL } from "@/modules/farol/regras";

/**
 * Farol de status. A cor nunca é o único sinal — vem sempre com o rótulo
 * escrito, porque parte dos usuários não é técnica e daltonismo é comum.
 *
 * As cores são as do mockup (`--green`, `--yellow`, `--red`). O laranja que o
 * mockup também define ficou de fora: o cliente confirmou em 07/09/2026 que
 * são três faixas mais o cinza (`docs/pontos-para-reuniao.md`, ponto 1).
 *
 * O rótulo nunca quebra em duas linhas — a etiqueta divide a primeira linha do
 * cartão com o nome da obra, e quebrada ela vira um borrão cinza no canto.
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
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap"
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
