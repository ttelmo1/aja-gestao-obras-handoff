"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Perfil } from "@/generated/prisma/enums";
import { pode, type Recurso } from "@/modules/auth/permissoes";

/**
 * Abas da obra, na ordem do mockup. São rotas de verdade, não troca de
 * `display`: cada aba tem URL própria, dá para deixar aberta numa segunda
 * janela e o botão voltar do navegador funciona.
 *
 * Cada aba declara o recurso que sua página exige, e a barra esconde o que o
 * perfil não pode abrir — mesmo critério que o menu principal aplica à
 * `NAVEGACAO`. Sem isso, a aba aparece e o clique cai em `/sem-permissao`.
 */
const ABAS: { sufixo: string; rotulo: string; recurso: Recurso }[] = [
  { sufixo: "", rotulo: "Resumo", recurso: "obra" },
  { sufixo: "/contrato", rotulo: "Contrato", recurso: "obra" },
  { sufixo: "/medicoes", rotulo: "Medições", recurso: "medicao" },
  { sufixo: "/rerratificacoes", rotulo: "Rerratificações", recurso: "rerratificacao" },
  { sufixo: "/documentos", rotulo: "Documentos", recurso: "documento" },
  { sufixo: "/historico", rotulo: "Histórico", recurso: "auditoria" },
];

export function AbasDaObra({ obraId, perfil }: { obraId: string; perfil: Perfil }) {
  const atual = usePathname();
  const base = `/obras/${obraId}`;
  const visiveis = ABAS.filter((aba) => pode(perfil, aba.recurso, "ver"));

  return (
    <nav className="my-4 flex gap-1.5 overflow-x-auto">
      {visiveis.map((aba) => {
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
