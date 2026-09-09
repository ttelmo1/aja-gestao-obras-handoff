import Link from "next/link";

import { BadgeFarol } from "@/components/ui/badge-farol";
import { Dado, Dados, Progresso } from "@/components/ui/dados";
import type { StatusObra } from "@/generated/prisma/enums";
import { formatarData } from "@/lib/date-br";
import { formatarBRL } from "@/lib/money";
import { ROTULOS_STATUS } from "@/modules/obras/filtros";
import {
  situacaoDoOperador,
  type AtribuicaoOperador,
} from "@/modules/obras/operador";
import type { ResumoObra } from "@/modules/obras/resumo";

/**
 * Cartão de obra do painel — a tela que o cliente já viu no mockup. A faixa
 * navio na lateral esquerda e as barras de progresso vêm de lá. A barra de
 * execução física saiu em 09/09/2026 junto com o dado (requisitos.md 1.4), e é
 * o espaço dela que o operador ocupa. O código continua aqui: é a chave que
 * liga a obra no sistema à pasta dela na rede.
 */
export type ObraNoPainel = {
  id: string;
  codigo: string;
  objeto: string;
  numeroContrato: string;
  status: StatusObra;
  contratante: { nome: string };
  operadorId: string | null;
  operador: { nome: string } | null;
  operadorAssumidoEm: Date | null;
  operadorLiberadoEm: Date | null;
  operadorObservacao: string | null;
  dataOrdemInicio: Date | null;
  dataPrevistaTermino: Date | null;
  resumo: ResumoObra;
};

export function CartaoObra({ obra }: { obra: ObraNoPainel }) {
  const { financeiro, prazo, medicao, farol, motivosFarol, motivoPrincipalFarol } =
    obra.resumo;
  const operador = situacaoDoOperador(atribuicaoDe(obra));
  // O cliente quer o farol para "chamar a atenção e o responsável trabalhar em
  // cima" — então o motivo fica escrito no cartão, e não só no hover, que não
  // existe em tablet. Verde e cinza não precisam: a ausência de alerta é o
  // recado.
  const alerta = farol === "AMARELO" || farol === "VERMELHO";

  return (
    <Link
      href={`/obras/${obra.id}`}
      className="relative block overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5 pl-6 shadow-[var(--sombra-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--sombra-hover)]"
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[5px] bg-[var(--primary)]"
      />

      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[17px] leading-tight font-bold text-[var(--primary)]">
            {obra.objeto}
          </h3>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            Contrato {obra.numeroContrato} · {obra.contratante.nome}
          </p>
          <p className="mt-1.5 text-[11px] font-bold tracking-wide text-[var(--muted)] uppercase">
            {ROTULOS_STATUS[obra.status]}
          </p>
        </div>
        <BadgeFarol farol={farol} titulo={motivosFarol.join(" ")} />
      </div>

      {alerta && motivoPrincipalFarol && (
        <p
          className="mb-3 text-[12px] font-semibold"
          style={{ color: farol === "VERMELHO" ? "var(--red)" : "var(--warning-fg)" }}
        >
          {motivoPrincipalFarol}
          {motivosFarol.length > 1 && (
            <span className="font-normal text-[var(--muted)]">
              {" "}
              +{motivosFarol.length - 1}
            </span>
          )}
        </p>
      )}

      <Dados>
        <Dado rotulo="Código">{obra.codigo}</Dado>
        {/* Operador só em atenção ou crítico: obra em dia não tem o que
            atribuir, e o rótulo vazio em quinze cartões verdes é ruído. */}
        {alerta && (
          <Dado rotulo={operador.assumida ? "Operador" : "Último operador"}>
            {operador.nome ?? "a assumir"}
          </Dado>
        )}
        <Dado rotulo="Início">{formatarData(obra.dataOrdemInicio) || "—"}</Dado>
        <Dado rotulo="Término previsto">
          {formatarData(obra.dataPrevistaTermino) || "—"}
        </Dado>
        <Dado rotulo="Última medição">{formatarData(medicao?.ultima)}</Dado>
        <Dado rotulo="Próxima medição">
          {medicao ? (
            <span className={medicao.atrasada ? "text-[var(--danger)]" : undefined}>
              {formatarData(medicao.proxima)}
              {medicao.atrasada && " · vencida"}
            </span>
          ) : (
            "—"
          )}
        </Dado>
      </Dados>

      {prazo && (
        <Progresso rotulo="Prazo transcorrido" percentual={prazo.percentualTranscorrido} />
      )}
      <Progresso
        rotulo="Financeiro medido"
        percentual={financeiro.percentualMedido.toNumber()}
        tom="ouro"
      />

      <div className="mt-3.5 grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-3">
        <Dado rotulo="Medido x contrato">
          <span className="tabular">
            {formatarBRL(financeiro.valorMedidoTotal)} /{" "}
            {formatarBRL(financeiro.valorContratadoAtual)}
          </span>
        </Dado>
        <Dado rotulo="Saldo a medir">
          <span className="tabular">{formatarBRL(financeiro.saldoAMedir)}</span>
        </Dado>
      </div>
    </Link>
  );
}

/** Os quatro campos do operador, do jeito que o módulo os lê. */
function atribuicaoDe(obra: ObraNoPainel): AtribuicaoOperador {
  return {
    operadorId: obra.operadorId,
    operadorNome: obra.operador?.nome ?? null,
    operadorAssumidoEm: obra.operadorAssumidoEm,
    operadorLiberadoEm: obra.operadorLiberadoEm,
    operadorObservacao: obra.operadorObservacao,
  };
}
