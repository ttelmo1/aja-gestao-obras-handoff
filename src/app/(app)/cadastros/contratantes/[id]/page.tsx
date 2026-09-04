import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Alerta } from "@/components/ui/formulario";
import { exigirPermissao } from "@/lib/guarda";
import { prisma } from "@/lib/prisma";
import { pode } from "@/modules/auth/permissoes";

import { BotaoExcluir, FormContratante } from "../../formularios";

export const metadata = { title: "Contratante" };
export const dynamic = "force-dynamic";

export default async function ContratantePage({
  params,
  searchParams,
}: PageProps<"/cadastros/contratantes/[id]">) {
  const usuario = await exigirPermissao("cadastro", "ver");
  const { id } = await params;
  const { criado } = await searchParams;

  const contratante = await prisma.contratante.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      cnpj: true,
      esfera: true,
      contato: true,
      telefone: true,
      email: true,
      ativo: true,
      _count: { select: { obras: true } },
    },
  });
  if (!contratante) notFound();

  const { _count, ...dados } = contratante;

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {criado && <Alerta tipo="sucesso">Contratante cadastrado.</Alerta>}
      <Card titulo={contratante.nome}>
        <FormContratante padrao={dados} />
      </Card>

      {pode(usuario.perfil, "cadastro", "excluir") && (
        <Card titulo="Excluir">
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-[var(--muted)]">
              {_count.obras === 0
                ? "Este contratante não está vinculado a nenhuma obra."
                : `Vinculado a ${_count.obras} obra(s) — não pode ser apagado, só desativado.`}
            </p>
            <BotaoExcluir id={contratante.id} entidade="Contratante" />
          </div>
        </Card>
      )}
    </div>
  );
}
