import Link from "next/link";

/**
 * Shell da área autenticada. A checagem de sessão entra aqui na etapa 1
 * (auth/RBAC) — por enquanto o layout é só a moldura de navegação.
 */
const NAVEGACAO = [
  { href: "/dashboard", rotulo: "Painel" },
  { href: "/obras", rotulo: "Obras" },
  { href: "/documentos", rotulo: "Documentos" },
  { href: "/relatorios", rotulo: "Relatórios" },
  { href: "/cadastros", rotulo: "Cadastros" },
];

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
          <Link
            href="/dashboard"
            className="font-semibold tracking-tight text-[var(--primary)]"
          >
            AJA · Gestão de Obras
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {NAVEGACAO.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--background)] hover:text-[var(--foreground)]"
              >
                {item.rotulo}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {children}
      </main>

      <footer className="border-t border-[var(--border)] px-4 py-3 text-center text-xs text-[var(--muted)]">
        AJA Grupo Empresarial — uso interno, rede local
      </footer>
    </div>
  );
}
