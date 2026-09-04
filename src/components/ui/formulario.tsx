import type { ReactNode } from "react";

/**
 * Campos de formulário. Concentrados aqui para que rótulo, foco e mensagem de
 * erro se comportem igual em todas as telas — inclusive a acessibilidade, que
 * é fácil de esquecer campo a campo.
 */
export function Campo({
  id,
  rotulo,
  dica,
  children,
}: {
  id: string;
  rotulo: string;
  dica?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {rotulo}
      </label>
      {children}
      {dica && <p className="text-xs text-[var(--muted)]">{dica}</p>}
    </div>
  );
}

export const classeInput =
  "w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:opacity-60";

export function Botao({
  children,
  variante = "primario",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "primario" | "secundario" | "perigo";
}) {
  const estilos = {
    primario:
      "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]",
    secundario:
      "border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--background)]",
    perigo: "border border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger-bg)]",
  }[variante];

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${estilos} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

/**
 * `role="alert"` faz o leitor de tela anunciar a mensagem assim que ela
 * aparece — sem isso, quem não vê a tela não descobre que o login falhou.
 */
export function Alerta({
  tipo,
  children,
}: {
  tipo: "erro" | "sucesso";
  children: ReactNode;
}) {
  const estilo =
    tipo === "erro"
      ? "border-[var(--danger)]/30 bg-[var(--danger-bg)] text-[var(--danger)]"
      : "border-[var(--success)]/30 bg-[var(--success-bg)] text-[var(--success)]";
  return (
    <p role="alert" className={`rounded-md border px-3 py-2 text-sm ${estilo}`}>
      {children}
    </p>
  );
}
