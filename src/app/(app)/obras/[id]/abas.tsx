"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Abas da obra, na ordem do mockup. São rotas de verdade, não troca de
 * `display`: cada aba tem URL própria, dá para deixar aberta numa segunda
 * janela e o botão voltar do navegador funciona.
 */
const ABAS = [
  { sufixo: "", rotulo: "Resumo" },
  { sufixo: "/contrato", rotulo: "Contrato" },
  { sufixo: "/medicoes", rotulo: "Medições" },
  { sufixo: "/rerratificacoes", rotulo: "Rerratificações" },
  { sufixo: "/documentos", rotulo: "Documentos" },
  { sufixo: "/historico", rotulo: "Histórico" },
];

export function AbasDaObra({ obraId }: { obraId: string }) {
  const atual = usePathname();
  const base = `/obras/${obraId}`;

  return (
    <nav className="my-4 flex gap-1.5 overflow-x-auto">
      {ABAS.map((aba) => {
        const href = `${base}${aba.sufixo}`;
        const ativa = atual === href;
        return (
          <Link
            key={aba.sufixo}
            href={href}
            aria-current={ativa ? "page" : undefined}
            className={`rounded-lg border px-3.5 py-2.5 text-sm font-bold whitespace-nowrap transition-colors ${
              ativa
                ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--primary)] hover:border-[var(--gold)]"
            }`}
          >
            {aba.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
