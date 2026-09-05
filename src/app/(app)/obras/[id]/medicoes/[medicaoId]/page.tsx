import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Dado } from "@/components/ui/dados";
import { TipoEtapa } from "@/generated/prisma/enums";
import { exigirPermissao } from "@/lib/guarda";
import { paraCampoDinheiro } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { pode } from "@/modules/auth/permissoes";
import { situacaoDaTramitacao } from "@/modules/tramitacao/movimentos";

import {
  carregarEtapas,
  carregarMedicoes,
  carregarObra,
  paraCampoData,
  paraCampoMes,
} from "../../dados";
import { FormEntrada } from "../../tramitacao/formularios";
import { TabelaMovimentos } from "../../tramitacao/tabela-movimentos";
import { BotaoExcluirMedicao, FormularioMedicao } from "../formulario";

export const metadata = { title: "Medição" };
export const dynamic = "force-dynamic";

export default async function EditarMedicaoPage({
  params,
}: PageProps<"/obras/[id]/medicoes/[medicaoId]">) {
  const usuario = await exigirPermissao("medicao", "editar");
  const { id, medicaoId } = await params;

  const [obra, medicoes, etapas, responsaveis, setores] = await Promise.all([
    carregarObra(id),
    carregarMedicoes(id),
    carregarEtapas(id),
    prisma.responsavel.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.setor.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, sigla: true },
    }),
  ]);
  if (!obra) notFound();

  const medicao = medicoes.find((m) => m.id === medicaoId);
  if (!medicao) notFound();

  // A tramitação da medição são os movimentos da etapa MEDICOES marcados com
  // o id desta medição — cada uma tem protocolo próprio e caminha sozinha.
  const etapaMedicoes = etapas.find((e) => e.tipo === TipoEtapa.MEDICOES);
  const agora = new Date();
  const hoje = paraCampoData(agora) ?? "";
  const tramitacao = situacaoDaTramitacao(medicao.movimentos, agora);
  const dispensada = etapaMedicoes?.status === "NAO_SE_APLICA";

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
            percentualExecutado: medicao.percentualExecutado.toFixed(2).replace(".", ","),
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

      <Card
        titulo="Tramitação do processo"
        acao={
          tramitacao.atual ? (
            <span
              className="text-sm font-bold"
              style={{
                color:
                  tramitacao.diasParado! >= 15 ? "var(--danger)" : "var(--primary)",
              }}
            >
              {tramitacao.atual.setorDestino.nome} · há {tramitacao.diasParado}{" "}
              dia(s)
            </span>
          ) : undefined
        }
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Dado rotulo="Protocolo">{medicao.protocolo ?? "—"}</Dado>
          <Dado rotulo="Setores percorridos">
            {tramitacao.quantidadeMovimentos}
          </Dado>
          <Dado rotulo="Tempo somado">
            {tramitacao.quantidadeMovimentos > 0
              ? `${tramitacao.diasTotais} dia(s)`
              : "—"}
          </Dado>
        </div>

        <TabelaMovimentos
          movimentos={medicao.movimentos}
          agora={agora}
          hoje={hoje}
          podeEditar={pode(usuario.perfil, "tramitacao", "editar")}
          podeExcluir={pode(usuario.perfil, "tramitacao", "excluir")}
        />

        {etapaMedicoes &&
          !dispensada &&
          pode(usuario.perfil, "tramitacao", "criar") && (
            <div className="mt-5 border-t border-[var(--border)] pt-5">
              <h3 className="mb-3 text-[13px] font-bold text-[var(--primary)]">
                Encaminhar esta medição a um setor
              </h3>
              <FormEntrada
                etapaObraId={etapaMedicoes.id}
                medicaoId={medicao.id}
                setores={setores}
                hoje={hoje}
              />
            </div>
          )}
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
