import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { exigirPermissao } from "@/lib/guarda";
import { paraCampoDinheiro } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { pode } from "@/modules/auth/permissoes";
import { contarDocumentosPorMedicao } from "@/modules/medicoes/exclusao";

import {
  carregarDocumentos,
  carregarMedicoes,
  carregarObra,
  paraCampoData,
  paraCampoMes,
} from "../../dados";
import { EnviarDocumentos } from "../../documentos/enviar";
import { ListaDocumentos } from "../../documentos/lista";
import { medicaoParaExcluir } from "../exclusao";
import { BotaoExcluirMedicao, FormularioMedicao } from "../formulario";

export const metadata = { title: "Medição" };
export const dynamic = "force-dynamic";

export default async function EditarMedicaoPage({
  params,
}: PageProps<"/obras/[id]/medicoes/[medicaoId]">) {
  const usuario = await exigirPermissao("medicao", "editar");
  const { id, medicaoId } = await params;

  const [obra, medicoes, documentos, responsaveis] = await Promise.all([
    carregarObra(id),
    carregarMedicoes(id),
    carregarDocumentos(id),
    prisma.responsavel.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ]);
  if (!obra) notFound();

  const medicao = medicoes.find((m) => m.id === medicaoId);
  if (!medicao) notFound();

  const documentosDaMedicao = documentos.filter((d) => d.medicaoId === medicao.id);

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
            valorMedido: paraCampoDinheiro(medicao.valorMedido) ?? "",
            protocolo: medicao.protocolo,
            dataProtocolo: paraCampoData(medicao.dataProtocolo),
            notaFiscalNumero: medicao.notaFiscalNumero,
            notaFiscalData: paraCampoData(medicao.notaFiscalData),
            notaFiscalValor: paraCampoDinheiro(medicao.notaFiscalValor),
            issAliquota: medicao.issAliquota?.toFixed(2).replace(".", ",") ?? null,
            issValor: paraCampoDinheiro(medicao.issValor),
            responsavelId: medicao.responsavelId,
            status: medicao.status,
            dataPagamento: paraCampoData(medicao.dataPagamento),
            observacoes: medicao.observacoes,
          }}
        />
      </Card>

      <Card titulo={`Documentos da medição (${documentosDaMedicao.length})`}>
        <p className="mb-4 text-sm text-[var(--muted)]">
          Medição assinada, protocolo, nota fiscal, guia do ISS, memória de
          cálculo — cada medição pode ter quantos documentos precisar.
        </p>

        <ListaDocumentos
          documentos={documentosDaMedicao}
          podeExcluir={pode(usuario.perfil, "documento", "excluir")}
          mostrarOrigem={false}
          vazio="Nenhum documento anexado a esta medição."
        />

        {pode(usuario.perfil, "documento", "criar") && (
          <div className="mt-5 border-t border-[var(--border)] pt-5">
            <EnviarDocumentos
              obraId={obra.id}
              contexto="medicao"
              medicaoId={medicao.id}
              titulo="Enviar outro documento da medição"
            />
          </div>
        )}
      </Card>

      {pode(usuario.perfil, "medicao", "excluir") && (
        <Card titulo="Excluir medição">
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-[var(--muted)]">
              A exclusão apaga a medição. Medição com documento ativo não pode
              ser apagada: exclua os documentos antes, na aba Documentos.
            </p>
            <BotaoExcluirMedicao
              medicao={medicaoParaExcluir(
                medicao,
                contarDocumentosPorMedicao(documentos),
              )}
              gatilho="botao"
            />
          </div>
        </Card>
      )}
    </div>
  );
}
