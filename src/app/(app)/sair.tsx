import { sair } from "@/app/(auth)/acoes";

/**
 * Sair é uma mutação (apaga a sessão do banco), então precisa ser POST — um
 * link GET seria disparado por qualquer prefetch do navegador.
 */
export function BotaoSair() {
  return (
    <form action={sair}>
      <button
        type="submit"
        className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm transition-colors hover:bg-[var(--background)]"
      >
        Sair
      </button>
    </form>
  );
}
