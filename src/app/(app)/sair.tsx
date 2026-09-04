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
        className="rounded-lg border border-white/30 px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
      >
        Sair
      </button>
    </form>
  );
}
