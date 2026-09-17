import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { exigirPermissao } from "@/lib/guarda";
import { paraCampoDinheiro } from "@/lib/money";
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

  const podeExcluir = pode(usuario.perfil, "obra", "excluir");
  const [contratantes, documentosAtivos] = await Promise.all([
    prisma.contratante.findMany({
      where: { OR: [{ ativo: true }, { id: obra.contratanteId }] },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    // `obra._count.documentos` inclui os excluídos; a trava é só o ativo.
    podeExcluir
      ? prisma.documento.count({ where: { obraId: obra.id, excluidoEm: null } })
      : 0,
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <Card titulo="Dados contratuais">
        <FormularioObra
          contratantes={contratantes}
          padrao={{
            id: obra.id,
            objeto: obra.objeto,
            numeroContrato: obra.numeroContrato,
            numeroProcesso: obra.numeroProcesso,
            contratanteId: obra.contratanteId,
            valorContratado: paraCampoDinheiro(obra.valorContratado) ?? "",
            dataAssinatura: paraCampoData(obra.dataAssinatura),
            dataOrdemInicio: paraCampoData(obra.dataOrdemInicio),
            prazoDias: obra.prazoDias,
            dataPrevistaTermino: paraCampoData(obra.dataPrevistaTermino),
            dataTerminoReal: paraCampoData(obra.dataTerminoReal),
            status: obra.status,
            periodicidadeMedicao: obra.periodicidadeMedicao,
            intervaloMedicaoDias: obra.intervaloMedicaoDias,
            observacoes: obra.observacoes,
          }}
        />
      </Card>

      {podeExcluir && (
        <Card titulo="Excluir obra">
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-[var(--muted)]">
              Obra com documento ativo não pode ser apagada: exclua os
              documentos antes, na aba Documentos. Sem documentos, a obra sai
              junto com medições, rerratificações e tramitação. Para só encerrar
              o contrato mantendo o histórico, use a situação{" "}
              <strong>Cancelada</strong>.
            </p>
            <BotaoExcluirObra
              obra={{
                id: obra.id,
                numeroContrato: obra.numeroContrato,
                objeto: obra.objeto,
                contratante: obra.contratante.nome,
                medicoes: obra._count.medicoes,
                rerratificacoes: obra._count.rerratificacoes,
                documentosAtivos,
              }}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
