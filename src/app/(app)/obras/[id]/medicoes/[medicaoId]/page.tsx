import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { exigirPermissao } from "@/lib/guarda";
import { prisma } from "@/lib/prisma";
import { pode } from "@/modules/auth/permissoes";

import { carregarMedicoes, carregarObra, paraCampoData, paraCampoMes } from "../../dados";
import { BotaoExcluirMedicao, FormularioMedicao } from "../formulario";

export const metadata = { title: "Medição" };
export const dynamic = "force-dynamic";

export default async function EditarMedicaoPage({
  params,
}: PageProps<"/obras/[id]/medicoes/[medicaoId]">) {
  const usuario = await exigirPermissao("medicao", "editar");
  const { id, medicaoId } = await params;

  const [obra, medicoes, responsaveis] = await Promise.all([
    carregarObra(id),
    carregarMedicoes(id),
    prisma.responsavel.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ]);
  if (!obra) notFound();

  const medicao = medicoes.find((m) => m.id === medicaoId);
  if (!medicao) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Card
        titulo={`Medição nº ${String(medicao.numero).padStart(2, "0")}${
          medicao.protocolo ? ` · Protocolo ${medicao.protocolo}` : ""
        }`}
      >
        <FormularioMedicao
          obraId={obra.id}
          responsaveis={responsaveis}
          numeroSugerido={medicao.numero}
          competenciaSugerida={paraCampoMes(medicao.competencia) ?? ""}
          padrao={{
            id: medicao.id,
            numero: medicao.numero,
            competencia: paraCampoMes(medicao.competencia) ?? "",
            dataMedicao: paraCampoData(medicao.dataMedicao),
            periodoInicio: paraCampoData(medicao.periodoInicio),
            periodoFim: paraCampoData(medicao.periodoFim),
            valorMedido: medicao.valorMedido.toFixed(2),
            percentualExecutado: medicao.percentualExecutado.toFixed(2),
            protocolo: medicao.protocolo,
            dataProtocolo: paraCampoData(medicao.dataProtocolo),
            notaFiscalNumero: medicao.notaFiscalNumero,
            notaFiscalData: paraCampoData(medicao.notaFiscalData),
            notaFiscalValor: medicao.notaFiscalValor?.toFixed(2) ?? null,
            issAliquota: medicao.issAliquota?.toFixed(2) ?? null,
            issValor: medicao.issValor?.toFixed(2) ?? null,
            responsavelId: medicao.responsavelId,
            status: medicao.status,
            dataPagamento: paraCampoData(medicao.dataPagamento),
            observacoes: medicao.observacoes,
          }}
        />
      </Card>

      {pode(usuario.perfil, "medicao", "excluir") && (
        <Card titulo="Excluir medição">
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-[var(--muted)]">
              Só medição em rascunho pode ser apagada. Depois de protocolada, o
              caminho é marcá-la como <strong>Rejeitada</strong> — o processo já
              existe no órgão e o histórico precisa continuar existindo.
            </p>
            <BotaoExcluirMedicao id={medicao.id} />
          </div>
        </Card>
      )}
    </div>
  );
}
