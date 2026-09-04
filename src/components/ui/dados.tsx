import type { ReactNode } from "react";

/**
 * Par rótulo/valor — o `.item-label` + `.item-value` do mockup. É a unidade
 * de leitura de dado do sistema inteiro: rótulo miúdo em caixa alta por cima,
 * valor em negrito por baixo.
 */
export function Dado({
  rotulo,
  children,
}: {
  rotulo: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] tracking-wide text-[var(--muted)] uppercase">
        {rotulo}
      </div>
      <div className="mt-0.5 text-sm font-bold">{children ?? "—"}</div>
    </div>
  );
}

/** Grade de pares rótulo/valor. */
export function Dados({
  colunas = 2,
  children,
}: {
  colunas?: 2 | 3;
  children: ReactNode;
}) {
  return (
    <div
      className={`grid gap-3 ${colunas === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
    >
      {children}
    </div>
  );
}

/**
 * Barra de progresso. `tom="ouro"` é o financeiro, navio é o físico — mesma
 * distinção de cor do mockup, que separa avanço de obra de avanço de dinheiro.
 *
 * O percentual vai escrito ao lado, e a barra é `role="img"` com rótulo: sem
 * isso, quem usa leitor de tela recebe uma div vazia.
 */
export function Progresso({
  rotulo,
  percentual,
  tom = "navio",
}: {
  rotulo: string;
  percentual: number;
  tom?: "navio" | "ouro";
}) {
  const largura = Math.min(100, Math.max(0, percentual));
  const cor = tom === "ouro" ? "var(--gold)" : "var(--primary)";

  return (
    <div className="mt-3">
      <div className="mb-1.5 flex justify-between text-xs text-[var(--muted)]">
        <span>{rotulo}</span>
        <span className="tabular font-bold text-[var(--foreground)]">
          {Math.round(percentual)}%
        </span>
      </div>
      <div
        role="img"
        aria-label={`${rotulo}: ${Math.round(percentual)} por cento`}
        className="h-2 overflow-hidden rounded-full bg-[#e9edf1]"
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${largura}%`, background: cor }}
        />
      </div>
    </div>
  );
}
