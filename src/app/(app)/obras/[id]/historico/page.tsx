import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import {
  BarraDeFiltrosAuditoria,
  PaginacaoAuditoria,
} from "@/components/ui/filtros-auditoria";
import { LinhaDoTempo, SemEventos } from "@/components/ui/linha-do-tempo";
import { exigirPermissao } from "@/lib/guarda";
import { prisma } from "@/lib/prisma";
import {
  condicaoDeAuditoria,
  lerFiltrosAuditoria,
  POR_PAGINA,
  pularRegistros,
  temFiltroAuditoria,
} from "@/modules/auditoria/filtros";

import { carregarObra } from "../dados";

export const metadata = { title: "Histórico" };
export const dynamic = "force-dynamic";

/**
 * Aba Histórico — a linha do tempo do mockup, alimentada pela trilha de
 * auditoria que grava desde a etapa 0 (requisitos.md 1.8).
 *
 * A tabela é append-only por trigger no banco: nada aqui edita ou apaga, e a
 * matriz de permissões dá só leitura de auditoria a todos os perfis,
 * inclusive ao administrador.
 */
export default async function HistoricoPage({
  params,
  searchParams,
}: PageProps<"/obras/[id]/historico">) {
  await exigirPermissao("auditoria", "ver");
  const { id } = await params;
  const filtros = lerFiltrosAuditoria(await searchParams);

  const obra = await carregarObra(id);
  if (!obra) notFound();

  const where = condicaoDeAuditoria(filtros, obra.id);
  const [eventos, total] = await Promise.all([
    prisma.auditoria.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      skip: pularRegistros(filtros),
      take: POR_PAGINA,
    }),
    prisma.auditoria.count({ where }),
  ]);

  const base = `/obras/${obra.id}/historico`;
  const ultimaPagina = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <div className="flex flex-col gap-4">
      <Card titulo="Histórico da Obra">
        <p className="mb-4 text-sm text-[var(--muted)]">
          Registro automático de toda ação relevante, com autor, data e hora.
          É somente leitura — nem o administrador altera ou apaga.
        </p>
        <BarraDeFiltrosAuditoria base={base} filtros={filtros} total={total} />
      </Card>

      <Card
        titulo={`Linha do tempo (página ${filtros.pagina} de ${ultimaPagina})`}
      >
        {eventos.length === 0 ? (
          <SemEventos filtrado={temFiltroAuditoria(filtros)} />
        ) : (
          <>
            <LinhaDoTempo eventos={eventos} />
            <PaginacaoAuditoria
              base={base}
              filtros={filtros}
              ultimaPagina={ultimaPagina}
            />
          </>
        )}
      </Card>
    </div>
  );
}
