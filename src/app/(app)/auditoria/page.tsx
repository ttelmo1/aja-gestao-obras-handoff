import Link from "next/link";

import { Card, Indicador, TituloPagina } from "@/components/ui/card";
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

export const metadata = { title: "Auditoria" };
export const dynamic = "force-dynamic";

const BASE = "/auditoria";

/**
 * Trilha de auditoria do sistema inteiro (requisitos.md 1.8).
 *
 * A aba da obra responde "o que aconteceu nesta obra"; esta responde "o que
 * fulano andou fazendo" e "quem mexeu nisso" — inclusive nos cadastros e nos
 * usuários, que não pertencem a obra nenhuma e por isso não aparecem lá.
 */
export default async function AuditoriaPage({
  searchParams,
}: PageProps<"/auditoria">) {
  await exigirPermissao("auditoria", "ver");
  const filtros = lerFiltrosAuditoria(await searchParams);
  const where = condicaoDeAuditoria(filtros);

  const [eventos, total, usuarios, desde] = await Promise.all([
    prisma.auditoria.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      skip: pularRegistros(filtros),
      take: POR_PAGINA,
    }),
    prisma.auditoria.count({ where }),
    prisma.usuario.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.auditoria.findFirst({
      orderBy: { criadoEm: "asc" },
      select: { criadoEm: true },
    }),
  ]);

  const ultimaPagina = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <div>
      <TituloPagina
        titulo="Auditoria"
        descricao="Toda ação relevante do sistema, com autor, data e hora."
      />

      <div className="mb-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        <Indicador rotulo="Registros no filtro" valor={String(total)} />
        <Indicador rotulo="Autores" valor={String(usuarios.length)} />
        <Indicador
          rotulo="Registrando desde"
          valor={
            desde
              ? new Intl.DateTimeFormat("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                }).format(desde.criadoEm)
              : "—"
          }
        />
      </div>

      <div className="flex flex-col gap-4">
        <Card titulo="Filtros">
          <p className="mb-4 rounded-lg border-l-4 border-[var(--gold)] bg-[#fff9ed] p-3 text-[13px]">
            A trilha é <strong>somente leitura</strong>: um gatilho no banco
            bloqueia alteração e exclusão, inclusive por acesso direto ao
            PostgreSQL. Para ver o histórico de uma obra específica, use a aba{" "}
            <Link
              href="/obras"
              className="underline underline-offset-2"
            >
              Histórico dentro dela
            </Link>
            .
          </p>
          <BarraDeFiltrosAuditoria
            base={BASE}
            filtros={filtros}
            total={total}
            usuarios={usuarios}
          />
        </Card>

        <Card titulo={`Linha do tempo (página ${filtros.pagina} de ${ultimaPagina})`}>
          {eventos.length === 0 ? (
            <SemEventos filtrado={temFiltroAuditoria(filtros)} />
          ) : (
            <>
              <LinhaDoTempo eventos={eventos} />
              <PaginacaoAuditoria
                base={BASE}
                filtros={filtros}
                ultimaPagina={ultimaPagina}
              />
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
