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
      <label htmlFor={id} className="text-xs font-bold text-[var(--muted)]">
        {rotulo}
      </label>
      {children}
      {dica && <p className="text-xs text-[var(--muted)]">{dica}</p>}
    </div>
  );
}

/**
 * Aparência do campo, sem largura.
 *
 * A largura fica de fora porque quem manda nela é o contexto: no formulário o
 * campo ocupa a coluna inteira (`classeInput`), na barra de filtros ele divide
 * a linha com os outros. Embutir `w-full` aqui obrigaria cada uso a tentar
 * desfazê-lo com `w-auto` — duas classes de mesma especificidade, onde vence a
 * ordem do CSS gerado e não a ordem em que foram escritas.
 */
export const classeCampo =
  "rounded-lg border border-[var(--border)] bg-[var(--surface-sutil)] px-3 py-2.5 text-sm outline-none transition-colors focus:border-[var(--primary)] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--primary)]/15 disabled:opacity-60";

/** Campo de formulário: ocupa a largura da coluna. */
export const classeInput = `w-full ${classeCampo}`;

/**
 * Botões do mockup: navio para a ação principal, dourado para a ação de
 * destaque (a que o cliente quer que salte na tela), branco com borda para o
 * resto. O dourado é acento, não alerta — perigo continua vermelho.
 */
export function Botao({
  children,
  variante = "primario",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "primario" | "destaque" | "secundario" | "perigo";
}) {
  const estilos = {
    primario: "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]",
    destaque: "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]",
    secundario:
      "border border-[var(--border)] bg-[var(--surface)] text-[var(--primary)] hover:bg-[var(--background)]",
    perigo:
      "border border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger-bg)]",
  }[variante];

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-lg px-3.5 py-2.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${estilos} ${props.className ?? ""}`}
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
    <p role="alert" className={`rounded-lg border px-3 py-2.5 text-sm ${estilo}`}>
      {children}
    </p>
  );
}
