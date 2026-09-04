import type { ReactNode } from "react";

/**
 * Moldura das telas públicas (login e redefinição de senha). Sem a navegação
 * da área interna: quem está aqui ainda não tem sessão.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <header className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-[var(--primary)]">
            AJA · Gestão de Obras
          </h1>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Sistema interno — acesso pela rede local
          </p>
        </header>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
