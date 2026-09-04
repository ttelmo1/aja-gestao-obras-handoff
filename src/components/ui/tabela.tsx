import type { ReactNode } from "react";

/**
 * Tabela no padrão do mockup: cabeçalho em navio sobre cinza claro, linhas
 * separadas por filete, rolagem horizontal própria — a página nunca rola de
 * lado, o que quebraria o uso em tablet.
 */
export function Tabela({
  colunas,
  children,
}: {
  colunas: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[#f7f9fb] text-left">
            {colunas.map((c) => (
              <th
                key={c}
                className="px-3 py-2.5 text-[11px] font-bold text-[var(--primary)]"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Linha({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-[var(--border)] last:border-0">{children}</tr>
  );
}

export function Celula({
  children,
  apagada = false,
  tabular = false,
}: {
  children: ReactNode;
  /** Texto secundário, em cinza. */
  apagada?: boolean;
  /** Números alinhados por coluna. */
  tabular?: boolean;
}) {
  return (
    <td
      className={`px-3 py-3 align-top ${apagada ? "text-[var(--muted)]" : ""} ${tabular ? "tabular" : ""}`}
    >
      {children}
    </td>
  );
}

/** Ativo / Inativo. Sempre com a palavra escrita, nunca só a cor. */
export function Situacao({ ativo }: { ativo: boolean }) {
  return ativo ? (
    <span className="rounded-full bg-[var(--success-bg)] px-2 py-0.5 text-[11px] font-bold text-[var(--success)]">
      Ativo
    </span>
  ) : (
    <span className="rounded-full bg-[#eef2f5] px-2 py-0.5 text-[11px] font-bold text-[var(--muted)]">
      Inativo
    </span>
  );
}
