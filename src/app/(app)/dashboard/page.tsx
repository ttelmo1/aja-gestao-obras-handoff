import { Card, Indicador, TituloPagina } from "@/components/ui/card";
import { Vazio } from "@/components/ui/vazio";
import { formatarBRL } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Painel" };

// Dados vivos e por usuário: nunca pré-renderizar em build.
export const dynamic = "force-dynamic";

/**
 * Painel inicial. Os indicadores já leem do banco para provar a fundação
 * ponta a ponta; os filtros e o detalhamento entram na etapa 4 (CRUD de obras
 * + dashboard), quando as obras existirem.
 */
export default async function DashboardPage() {
  const [totalObras, totalUsuarios, totalSetores, agregado] = await Promise.all(
    [
      prisma.obra.count(),
      prisma.usuario.count({ where: { ativo: true } }),
      prisma.setor.count({ where: { ativo: true } }),
      prisma.obra.aggregate({ _sum: { valorContratado: true } }),
    ],
  );

  return (
    <div className="space-y-5">
      <TituloPagina
        titulo="Painel de Obras"
        descricao="Visão geral das obras e processos."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador rotulo="Obras cadastradas" valor={String(totalObras)} />
        <Indicador
          rotulo="Valor contratado"
          valor={formatarBRL(agregado._sum.valorContratado ?? 0)}
        />
        <Indicador rotulo="Usuários ativos" valor={String(totalUsuarios)} />
        <Indicador rotulo="Setores" valor={String(totalSetores)} />
      </div>

      <Card titulo="Obras">
        <Vazio mensagem="Nenhuma obra cadastrada. O CRUD de obras entra na etapa 4." />
      </Card>
    </div>
  );
}
