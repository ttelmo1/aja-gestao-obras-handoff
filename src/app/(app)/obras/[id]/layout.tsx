import Link from "next/link";
import { notFound } from "next/navigation";

import { BadgeFarol } from "@/components/ui/badge-farol";
import { exigirPermissao } from "@/lib/guarda";
import { resumoDaObra } from "@/modules/obras/resumo";
import { ROTULOS_STATUS } from "@/modules/obras/filtros";

import { AbasDaObra } from "./abas";
import { carregarObra } from "./dados";

/**
 * Cabeçalho e abas da obra — a estrutura que o cliente viu no mockup. O
 * layout carrega a obra uma vez e as páginas de aba reaproveitam a mesma
 * consulta via `cache`.
 */
export default async function ObraLayout({
  children,
  params,
}: LayoutProps<"/obras/[id]">) {
  await exigirPermissao("obra", "ver");
  const { id } = await params;
  const obra = await carregarObra(id);
  if (!obra) notFound();

  const { farol, motivosFarol } = resumoDaObra(obra, obra.medicoes);

  return (
    <div>
      <Link
        href="/obras"
        className="mb-3 inline-block text-sm text-[var(--muted)] underline underline-offset-2"
      >
        ← Voltar ao painel
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sombra-card)]">
        <div>
          <h1 className="text-[22px] leading-tight font-bold text-[var(--primary)]">
            {obra.objeto}
          </h1>
          <p className="mt-1.5 text-sm text-[var(--muted)]">
            {obra.codigo} · Contrato {obra.numeroContrato} · {obra.contratante.nome}
            {obra.numeroProcesso && ` · Processo ${obra.numeroProcesso}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-[11px] font-bold tracking-wide text-[var(--primary)] uppercase">
            {ROTULOS_STATUS[obra.status]}
          </span>
          <BadgeFarol farol={farol} titulo={motivosFarol.join(" ")} />
        </div>
      </header>

      <AbasDaObra obraId={obra.id} />
      {children}
    </div>
  );
}
