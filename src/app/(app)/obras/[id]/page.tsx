import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Dado, Dados, Progresso } from "@/components/ui/dados";
import { Alerta } from "@/components/ui/formulario";
import { formatarData } from "@/lib/date-br";
import { exigirPermissao } from "@/lib/guarda";
import { formatarBRL, formatarPercentual } from "@/lib/money";
import { ROTULOS_ESFERA } from "@/modules/cadastros/rotulos";
import { exigeOperador, situacaoDoOperador } from "@/modules/obras/operador";
import { resumoDaObra } from "@/modules/obras/resumo";

import { carregarObra } from "./dados";
import { BlocoOperador } from "./operador";

export const metadata = { title: "Resumo da obra" };
export const dynamic = "force-dynamic";

export default async function ResumoObraPage({
  params,
  searchParams,
}: PageProps<"/obras/[id]">) {
  const usuario = await exigirPermissao("obra", "ver");
  const { id } = await params;
  const { criada } = await searchParams;

  const obra = await carregarObra(id);
  if (!obra) notFound();

  const agora = new Date();
  const {
    financeiro,
    prazo,
    terminoVigente,
    diasSuspensos,
    suspensaDesde,
    medicao,
    farol,
    motivosFarol,
  } = resumoDaObra(
    obra,
    obra.medicoes,
    agora,
  );

  const operador = situacaoDoOperador({
    operadorId: obra.operadorId,
    operadorNome: obra.operador?.nome ?? null,
    operadorAssumidoEm: obra.operadorAssumidoEm,
    operadorLiberadoEm: obra.operadorLiberadoEm,
    operadorObservacao: obra.operadorObservacao,
  });

  return (
    <div className="flex flex-col gap-4">
      {criada && <Alerta tipo="sucesso">Obra cadastrada.</Alerta>}

      {suspensaDesde && (
        <p className="rounded-lg border-l-4 border-[var(--gold)] bg-[#fff9ed] p-3 text-[13px]">
          <strong>Prazo suspenso desde {formatarData(suspensaDesde)}.</strong>{" "}
          Prazo e ciclo das medições estão parados e voltam a contar na data
          final da suspensão, na aba Contrato.
        </p>
      )}

      <Card titulo="Indicadores da obra">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Dado rotulo="Prazo transcorrido">
            {prazo ? `${prazo.percentualTranscorrido}%` : "—"}
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
          <Dado rotulo="Próxima medição">
            {medicao ? (
              <span
                className={medicao.atrasada ? "text-[var(--danger)]" : undefined}
              >
                {formatarData(medicao.proxima)}
                {medicao.atrasada &&
                  ` · vencida há ${Math.abs(medicao.diasRestantes)} dia(s)`}
              </span>
            ) : (
              "—"
            )}
          </Dado>
        </div>

        {prazo && (
          <Progresso
            rotulo="Prazo transcorrido"
            percentual={prazo.percentualTranscorrido}
          />
        )}
        <Progresso
          rotulo="Financeiro medido"
          percentual={financeiro.percentualMedido.toNumber()}
          tom="ouro"
        />

        <div className="mt-4 rounded-lg border-l-4 border-[var(--gold)] bg-[#fff9ed] p-3 text-[13px]">
          <strong>Farol {farol.toLowerCase()}:</strong> {motivosFarol.join(" ")}
        </div>
      </Card>

      {/* Só em atenção ou crítico: obra em dia não tem o que atribuir
          (requisitos.md 1.2). */}
      {exigeOperador(farol) && (
        <Card titulo="Operador">
          <BlocoOperador
            obraId={obra.id}
            situacao={operador}
            souEu={obra.operadorId === usuario.id}
          />
        </Card>
      )}

      <Card titulo="Informações gerais">
        <Dados colunas={3}>
          <Dado rotulo="Contratante">{obra.contratante.nome}</Dado>
          <Dado rotulo="Esfera">
            {obra.contratante.esfera ? ROTULOS_ESFERA[obra.contratante.esfera] : "—"}
          </Dado>
          <Dado rotulo="Assinatura">{formatarData(obra.dataAssinatura) || "—"}</Dado>
          <Dado rotulo="Ordem de início">
            {formatarData(obra.dataOrdemInicio) || "—"}
          </Dado>
          <Dado rotulo="Prazo">{obra.prazoDias ? `${obra.prazoDias} dias` : "—"}</Dado>
          {/* Do contrato assinado. Rerratificação não mexe nesta data — o
              prazo aprovado aparece na linha de baixo. */}
          <Dado rotulo="Término previsto">
            {formatarData(obra.dataPrevistaTermino) || "—"}
          </Dado>
          <Dado rotulo="Término vigente">
            {formatarData(terminoVigente) || "—"}
            {obra.prazoAditivadoDias > 0 && (
              <span className="block text-[11px] font-normal text-[var(--muted)]">
                +{obra.prazoAditivadoDias} dia(s) de rerratificação
              </span>
            )}
            {diasSuspensos > 0 && (
              <span className="block text-[11px] font-normal text-[var(--muted)]">
                +{diasSuspensos} dia(s) de suspensão
              </span>
            )}
          </Dado>
          <Dado rotulo="Dias restantes">
            {prazo ? (prazo.vencido ? `vencido há ${-prazo.diasRestantes}` : prazo.diasRestantes) : "—"}
          </Dado>
          {/* Só quando a obra acabou de fato: em obra em andamento a linha
              vazia convidava a digitar ali o término prorrogado, que é
              derivado e vive acima. */}
          {obra.dataTerminoReal && (
            <Dado rotulo="Término efetivo">{formatarData(obra.dataTerminoReal)}</Dado>
          )}
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
