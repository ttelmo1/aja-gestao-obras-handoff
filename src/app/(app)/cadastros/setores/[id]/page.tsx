import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Alerta } from "@/components/ui/formulario";
import { exigirPermissao } from "@/lib/guarda";
import { prisma } from "@/lib/prisma";
import { pode } from "@/modules/auth/permissoes";

import { BotaoExcluir, FormSetor } from "../../formularios";

export const metadata = { title: "Setor" };
export const dynamic = "force-dynamic";

export default async function SetorPage({
  params,
  searchParams,
}: PageProps<"/cadastros/setores/[id]">) {
  const usuario = await exigirPermissao("cadastro", "ver");
  const { id } = await params;
  const { criado } = await searchParams;

  const setor = await prisma.setor.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      sigla: true,
      ativo: true,
      _count: { select: { entradas: true, saidas: true } },
    },
  });
  if (!setor) notFound();

  const { _count, ...dados } = setor;
  const movimentos = _count.entradas + _count.saidas;

  return (
    <div className="flex max-w-lg flex-col gap-4">
      {criado && <Alerta tipo="sucesso">Setor cadastrado.</Alerta>}
      <Card titulo={setor.nome}>
        <FormSetor padrao={dados} />
      </Card>

      {pode(usuario.perfil, "cadastro", "excluir") && (
        <Card titulo="Excluir">
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-[var(--muted)]">
              {movimentos === 0
                ? "Este setor não aparece em nenhuma tramitação."
                : `Aparece em ${movimentos} movimento(s) de tramitação — não pode ser apagado, só desativado.`}
            </p>
            <BotaoExcluir id={setor.id} entidade="Setor" />
          </div>
        </Card>
      )}
    </div>
  );
}
