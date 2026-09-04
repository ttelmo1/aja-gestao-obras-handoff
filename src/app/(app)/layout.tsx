import Link from "next/link";

import { Marca } from "@/components/ui/marca";
import { exigirUsuario } from "@/lib/guarda";
import { pode, ROTULOS_PERFIL, type Recurso } from "@/modules/auth/permissoes";

import { BotaoSair } from "./sair";

/**
 * Shell da área autenticada, no formato do mockup: faixa navio com a marca em
 * cima, barra de navegação branca logo abaixo.
 *
 * `exigirUsuario` roda antes de qualquer página filha: é aqui que a sessão
 * vira barreira de verdade, não no `proxy.ts`.
 */
const NAVEGACAO: Array<{ href: string; rotulo: string; recurso: Recurso }> = [
  { href: "/obras", rotulo: "Painel de Obras", recurso: "obra" },
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
      <header className="faixa-marca text-white">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link href="/obras" className="text-white">
            <Marca />
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm">
              {usuario.nome} · {ROTULOS_PERFIL[usuario.perfil]}
            </span>
            <BotaoSair />
          </div>
        </div>
      </header>

      <nav className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-[1500px] gap-1 overflow-x-auto px-6">
          {itens.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="border-b-2 border-transparent px-3 py-3 text-sm font-bold whitespace-nowrap text-[var(--muted)] transition-colors hover:border-[var(--gold)] hover:text-[var(--primary)]"
            >
              {item.rotulo}
            </Link>
          ))}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-[1500px] flex-1 px-6 py-7">
        {children}
      </main>

      <footer className="border-t border-[var(--border)] px-6 py-3 text-center text-xs text-[var(--muted)]">
        AJA Grupo Empresarial — uso interno, rede local
      </footer>
    </div>
  );
}
