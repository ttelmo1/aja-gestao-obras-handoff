import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Dado, Dados, Progresso } from "@/components/ui/dados";
import { Alerta } from "@/components/ui/formulario";
import { formatarData } from "@/lib/date-br";
import { exigirPermissao } from "@/lib/guarda";
import { formatarBRL, formatarPercentual } from "@/lib/money";
import { ROTULOS_ESFERA } from "@/modules/cadastros/rotulos";
import { resumoDaObra } from "@/modules/obras/resumo";

import { carregarObra } from "./dados";

export const metadata = { title: "Resumo da obra" };
export const dynamic = "force-dynamic";

export default async function ResumoObraPage({
  params,
  searchParams,
}: PageProps<"/obras/[id]">) {
  await exigirPermissao("obra", "ver");
  const { id } = await params;
  const { criada } = await searchParams;

  const obra = await carregarObra(id);
  if (!obra) notFound();

  const { financeiro, prazo, farol, motivosFarol } = resumoDaObra(obra, obra.medicoes);

  return (
    <div className="flex flex-col gap-4">
      {criada && <Alerta tipo="sucesso">Obra cadastrada.</Alerta>}

      <Card titulo="Indicadores da obra">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Dado rotulo="Prazo transcorrido">
            {prazo ? `${prazo.percentualTranscorrido}%` : "—"}
          </Dado>
          <Dado rotulo="Execução física">
            {formatarPercentual(financeiro.percentualExecutado)}
          </Dado>
          <Dado rotulo="% medido">
            {formatarPercentual(financeiro.percentualMedido)}
          </Dado>
          <Dado rotulo="Valor medido">
            <span className="tabular">{formatarBRL(financeiro.valorMedidoTotal)}</span>
          </Dado>
          <Dado rotulo="Saldo a medir">
            <span className="tabular">{formatarBRL(financeiro.saldoAMedir)}</span>
          </Dado>
          <Dado rotulo="Medições">{financeiro.quantidadeMedicoes}</Dado>
        </div>

        {prazo && (
          <Progresso
            rotulo="Prazo transcorrido"
            percentual={prazo.percentualTranscorrido}
          />
        )}
        <Progresso
          rotulo="Execução física"
          percentual={financeiro.percentualExecutado.toNumber()}
        />
        <Progresso
          rotulo="Financeiro medido"
          percentual={financeiro.percentualMedido.toNumber()}
          tom="ouro"
        />

        <div className="mt-4 rounded-lg border-l-4 border-[var(--gold)] bg-[#fff9ed] p-3 text-[13px]">
          <strong>Farol {farol.toLowerCase()}:</strong> {motivosFarol.join(" ")}
        </div>
      </Card>

      <Card titulo="Informações gerais">
        <Dados colunas={3}>
          <Dado rotulo="Contratante">{obra.contratante.nome}</Dado>
          <Dado rotulo="Esfera">
            {obra.contratante.esfera ? ROTULOS_ESFERA[obra.contratante.esfera] : "—"}
          </Dado>
          <Dado rotulo="Responsável técnico">
            {obra.responsavel
              ? `${obra.responsavel.nome}${obra.responsavel.registro ? ` (${obra.responsavel.registro})` : ""}`
              : "—"}
          </Dado>
          <Dado rotulo="Assinatura">{formatarData(obra.dataAssinatura) || "—"}</Dado>
          <Dado rotulo="Ordem de início">
            {formatarData(obra.dataOrdemInicio) || "—"}
          </Dado>
          <Dado rotulo="Prazo">{obra.prazoDias ? `${obra.prazoDias} dias` : "—"}</Dado>
          <Dado rotulo="Término previsto">
            {formatarData(obra.dataPrevistaTermino) || "—"}
          </Dado>
          <Dado rotulo="Término real">
            {formatarData(obra.dataTerminoReal) || "—"}
          </Dado>
          <Dado rotulo="Dias restantes">
            {prazo ? (prazo.vencido ? `vencido há ${-prazo.diasRestantes}` : prazo.diasRestantes) : "—"}
          </Dado>
        </Dados>

        {obra.observacoes && (
          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <Dado rotulo="Observações">
              <span className="font-normal whitespace-pre-line">
                {obra.observacoes}
              </span>
            </Dado>
          </div>
        )}
      </Card>
    </div>
  );
}
