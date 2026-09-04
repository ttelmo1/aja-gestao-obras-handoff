import Link from "next/link";
import type { ReactNode } from "react";

import { TituloPagina } from "@/components/ui/card";
import { exigirPermissao } from "@/lib/guarda";

/**
 * Os três cadastros de apoio vivem sob uma página só, com abas — são listas
 * curtas, consultadas de vez em quando, e não merecem cada uma um item no
 * menu principal.
 */
const ABAS = [
  { href: "/cadastros/contratantes", rotulo: "Contratantes" },
  { href: "/cadastros/responsaveis", rotulo: "Responsáveis" },
  { href: "/cadastros/setores", rotulo: "Setores" },
];

export default async function CadastrosLayout({
  children,
}: {
  children: ReactNode;
}) {
  await exigirPermissao("cadastro", "ver");

  return (
    <div>
      <TituloPagina
        titulo="Cadastros"
        descricao="Contratantes, responsáveis técnicos e setores de tramitação."
      />
      <nav className="mb-4 flex gap-1.5 overflow-x-auto">
        {ABAS.map((aba) => (
          <Link
            key={aba.href}
            href={aba.href}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm font-bold whitespace-nowrap text-[var(--primary)] transition-colors hover:border-[var(--gold)]"
          >
            {aba.rotulo}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
