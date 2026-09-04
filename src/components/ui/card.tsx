import type { ReactNode } from "react";

export function Card({
  titulo,
  acao,
  children,
}: {
  titulo?: string;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      {(titulo || acao) && (
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          {titulo && <h2 className="text-sm font-semibold">{titulo}</h2>}
          {acao}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Indicador numérico do painel. */
export function Indicador({
  rotulo,
  valor,
  detalhe,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs font-medium text-[var(--muted)]">{rotulo}</p>
      <p className="tabular mt-1 text-2xl font-semibold">{valor}</p>
      {detalhe && (
        <p className="mt-1 text-xs text-[var(--muted)]">{detalhe}</p>
      )}
    </div>
  );
}
