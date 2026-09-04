import Link from "next/link";

import { exigirUsuario } from "@/lib/guarda";
import { pode, ROTULOS_PERFIL, type Recurso } from "@/modules/auth/permissoes";

import { BotaoSair } from "./sair";

/**
 * Shell da área autenticada. `exigirUsuario` roda antes de qualquer página
 * filha: é aqui que a sessão vira barreira de verdade, não no `proxy.ts`.
 */
const NAVEGACAO: Array<{ href: string; rotulo: string; recurso: Recurso }> = [
  { href: "/dashboard", rotulo: "Painel", recurso: "obra" },
  { href: "/obras", rotulo: "Obras", recurso: "obra" },
  { href: "/documentos", rotulo: "Documentos", recurso: "documento" },
  { href: "/relatorios", rotulo: "Relatórios", recurso: "relatorio" },
  { href: "/cadastros", rotulo: "Cadastros", recurso: "cadastro" },
  { href: "/usuarios", rotulo: "Usuários", recurso: "usuario" },
];

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const usuario = await exigirUsuario();
  // Esconder o link é conveniência, não segurança: cada página refaz a
  // checagem por conta própria.
  const itens = NAVEGACAO.filter((i) => pode(usuario.perfil, i.recurso, "ver"));

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
          <Link
            href="/dashboard"
            className="shrink-0 font-semibold tracking-tight text-[var(--primary)]"
          >
            AJA · Gestão de Obras
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {itens.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-sm whitespace-nowrap text-[var(--muted)] transition-colors hover:bg-[var(--background)] hover:text-[var(--foreground)]"
              >
                {item.rotulo}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <span className="hidden text-right text-xs leading-tight sm:block">
              <span className="block font-medium">{usuario.nome}</span>
              <span className="block text-[var(--muted)]">
                {ROTULOS_PERFIL[usuario.perfil]}
              </span>
            </span>
            <BotaoSair />
          </div>
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
