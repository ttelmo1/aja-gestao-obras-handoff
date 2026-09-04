import type { ReactNode } from "react";

import { Marca } from "@/components/ui/marca";

/**
 * Moldura das telas públicas (login e redefinição de senha). Sem a navegação
 * da área interna: quem está aqui ainda não tem sessão. A faixa navio da
 * marca vira o topo do cartão, para a identidade aparecer já no login.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--sombra-card)]">
          <div className="faixa-marca px-6 py-5 text-white">
            <Marca compacto subtitulo="Acesso pela rede local" />
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
