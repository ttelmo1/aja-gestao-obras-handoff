import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Alerta } from "@/components/ui/formulario";
import { exigirPermissao } from "@/lib/guarda";
import { prisma } from "@/lib/prisma";
import { pode } from "@/modules/auth/permissoes";

import { BotaoExcluir, FormResponsavel } from "../../formularios";

export const metadata = { title: "Responsável" };
export const dynamic = "force-dynamic";

export default async function ResponsavelPage({
  params,
  searchParams,
}: PageProps<"/cadastros/responsaveis/[id]">) {
  const usuario = await exigirPermissao("cadastro", "ver");
  const { id } = await params;
  const { criado } = await searchParams;

  const responsavel = await prisma.responsavel.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      cargo: true,
      registro: true,
      email: true,
      telefone: true,
      ativo: true,
      _count: { select: { obras: true } },
    },
  });
  if (!responsavel) notFound();

  const { _count, ...dados } = responsavel;

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {criado && <Alerta tipo="sucesso">Responsável cadastrado.</Alerta>}
      <Card titulo={responsavel.nome}>
        <FormResponsavel padrao={dados} />
      </Card>

      {pode(usuario.perfil, "cadastro", "excluir") && (
        <Card titulo="Excluir">
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-[var(--muted)]">
              {_count.obras === 0
                ? "Este responsável não está vinculado a nenhuma obra."
                : `Vinculado a ${_count.obras} obra(s) — não pode ser apagado, só desativado.`}
            </p>
            <BotaoExcluir id={responsavel.id} entidade="Responsavel" />
          </div>
        </Card>
      )}
    </div>
  );
}
