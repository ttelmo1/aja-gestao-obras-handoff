import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { exigirPermissao } from "@/lib/guarda";
import { prisma } from "@/lib/prisma";
import { pode } from "@/modules/auth/permissoes";

import { BotaoExcluirObra, FormularioObra } from "../../formulario";
import { carregarObra, paraCampoData } from "../dados";

export const metadata = { title: "Contrato" };
export const dynamic = "force-dynamic";

/**
 * Aba Contrato — os dados contratuais da obra, editáveis. Quem só tem
 * permissão de ver recebe a mesma tela em modo leitura, sem o formulário.
 */
export default async function ContratoPage({
  params,
}: PageProps<"/obras/[id]/contrato">) {
  const usuario = await exigirPermissao("obra", "ver");
  const { id } = await params;

  const obra = await carregarObra(id);
  if (!obra) notFound();

  if (!pode(usuario.perfil, "obra", "editar")) {
    return (
      <Card titulo="Dados contratuais">
        <p className="text-sm text-[var(--muted)]">
          Seu perfil permite consultar, não alterar. Os dados estão na aba
          Resumo.
        </p>
      </Card>
    );
  }

  const [contratantes, responsaveis] = await Promise.all([
    prisma.contratante.findMany({
      where: { OR: [{ ativo: true }, { id: obra.contratanteId }] },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.responsavel.findMany({
      where: obra.responsavelId
        ? { OR: [{ ativo: true }, { id: obra.responsavelId }] }
        : { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <Card titulo="Dados contratuais">
        <FormularioObra
          contratantes={contratantes}
          responsaveis={responsaveis}
          padrao={{
            id: obra.id,
            codigo: obra.codigo,
            objeto: obra.objeto,
            numeroContrato: obra.numeroContrato,
            numeroProcesso: obra.numeroProcesso,
            contratanteId: obra.contratanteId,
            responsavelId: obra.responsavelId,
            valorContratado: obra.valorContratado.toFixed(2),
            dataAssinatura: paraCampoData(obra.dataAssinatura),
            dataOrdemInicio: paraCampoData(obra.dataOrdemInicio),
            prazoDias: obra.prazoDias,
            dataPrevistaTermino: paraCampoData(obra.dataPrevistaTermino),
            dataTerminoReal: paraCampoData(obra.dataTerminoReal),
            status: obra.status,
            observacoes: obra.observacoes,
          }}
        />
      </Card>

      {pode(usuario.perfil, "obra", "excluir") && (
        <Card titulo="Excluir obra">
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-[var(--muted)]">
              Obra com medições, documentos ou rerratificações não pode ser
              apagada — use a situação <strong>Cancelada</strong>, que preserva
              o histórico do contrato.
            </p>
            <BotaoExcluirObra id={obra.id} />
          </div>
        </Card>
      )}
    </div>
  );
}
