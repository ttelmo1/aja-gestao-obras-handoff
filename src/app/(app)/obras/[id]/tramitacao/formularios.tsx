"use client";

import { useActionState } from "react";

import { Alerta, Botao, Campo, classeInput } from "@/components/ui/formulario";
import type { StatusEtapa } from "@/generated/prisma/enums";
import {
  ROTULOS_STATUS_ETAPA,
  STATUS_ETAPA,
} from "@/modules/tramitacao/fluxo";

import {
  excluirMovimento,
  registrarEntrada,
  registrarSaida,
  salvarEtapa,
  type EstadoTramitacao,
} from "./acoes";

type Opcao = { id: string; nome: string; sigla?: string | null };

function Mensagens({ estado }: { estado: EstadoTramitacao }) {
  return (
    <>
      {estado?.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      {estado?.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}
    </>
  );
}

/**
 * Encaminhar o processo a um setor. É a ação mais usada da tela, então fica
 * em primeiro e com o mínimo de campos: para onde foi e em que dia.
 */
export function FormEntrada({
  etapaObraId,
  medicaoId,
  setores,
  hoje,
}: {
  etapaObraId: string;
  /** Preenchido quando a tramitação é a de uma medição específica. */
  medicaoId?: string;
  setores: Opcao[];
  hoje: string;
}) {
  const [estado, acao, pendente] = useActionState<EstadoTramitacao, FormData>(
    registrarEntrada,
    undefined,
  );

  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="etapaObraId" value={etapaObraId} />
      {medicaoId && <input type="hidden" name="medicaoId" value={medicaoId} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id={`setorDestinoId-${etapaObraId}`} rotulo="Setor de destino">
          <select
            id={`setorDestinoId-${etapaObraId}`}
            name="setorDestinoId"
            required
            className={classeInput}
          >
            <option value="">Selecione…</option>
            {setores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
                {s.sigla ? ` (${s.sigla})` : ""}
              </option>
            ))}
          </select>
        </Campo>

        <Campo id={`dataEntrada-${etapaObraId}`} rotulo="Data de entrada">
          <input
            id={`dataEntrada-${etapaObraId}`}
            name="dataEntrada"
            type="date"
            required
            defaultValue={hoje}
            className={classeInput}
          />
        </Campo>
      </div>

      <Campo id={`obsEntrada-${etapaObraId}`} rotulo="Observações">
        <input
          id={`obsEntrada-${etapaObraId}`}
          name="observacoes"
          placeholder="Ex.: encaminhado para parecer técnico."
          className={classeInput}
        />
      </Campo>

      <Mensagens estado={estado} />
      <div>
        <Botao type="submit" variante="destaque" disabled={pendente}>
          {pendente ? "Registrando…" : "Registrar entrada"}
        </Botao>
      </div>
    </form>
  );
}

/** Baixa do setor atual. Aparece só na linha do movimento em aberto. */
export function FormSaida({
  movimentoId,
  hoje,
}: {
  movimentoId: string;
  hoje: string;
}) {
  const [estado, acao, pendente] = useActionState<EstadoTramitacao, FormData>(
    registrarSaida,
    undefined,
  );

  return (
    <form action={acao} className="flex flex-col gap-2">
      <input type="hidden" name="movimentoId" value={movimentoId} />
      <div className="flex flex-wrap items-end gap-2">
        <input
          name="dataSaida"
          type="date"
          required
          defaultValue={hoje}
          aria-label="Data de saída do setor"
          className={`${classeInput} w-auto`}
        />
        <Botao type="submit" variante="secundario" disabled={pendente}>
          {pendente ? "Registrando…" : "Registrar saída"}
        </Botao>
      </div>
      <Mensagens estado={estado} />
    </form>
  );
}

/** Situação e datas da etapa — inclusive o "não se aplica" do requisito 1.5. */
export function FormEtapa({
  etapaObraId,
  padrao,
}: {
  etapaObraId: string;
  padrao: {
    status: StatusEtapa;
    dataInicio: string | null;
    dataConclusao: string | null;
    observacoes: string | null;
  };
}) {
  const [estado, acao, pendente] = useActionState<EstadoTramitacao, FormData>(
    salvarEtapa,
    undefined,
  );

  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="etapaObraId" value={etapaObraId} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Campo
          id="status"
          rotulo="Situação da etapa"
          dica="“Não se aplica” tira a etapa deste contrato sem sumir com ela da tela."
        >
          <select
            id="status"
            name="status"
            defaultValue={padrao.status}
            className={classeInput}
          >
            {STATUS_ETAPA.map((s) => (
              <option key={s} value={s}>
                {ROTULOS_STATUS_ETAPA[s]}
              </option>
            ))}
          </select>
        </Campo>

        <Campo id="dataInicio" rotulo="Início">
          <input
            id="dataInicio"
            name="dataInicio"
            type="date"
            defaultValue={padrao.dataInicio ?? ""}
            className={classeInput}
          />
        </Campo>

        <Campo id="dataConclusao" rotulo="Conclusão">
          <input
            id="dataConclusao"
            name="dataConclusao"
            type="date"
            defaultValue={padrao.dataConclusao ?? ""}
            className={classeInput}
          />
        </Campo>
      </div>

      <Campo id="observacoesEtapa" rotulo="Observações da etapa">
        <textarea
          id="observacoesEtapa"
          name="observacoes"
          rows={2}
          defaultValue={padrao.observacoes ?? ""}
          className={`${classeInput} min-h-16`}
        />
      </Campo>

      <Mensagens estado={estado} />
      <div>
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar etapa"}
        </Botao>
      </div>
    </form>
  );
}

export function BotaoExcluirMovimento({ movimentoId }: { movimentoId: string }) {
  const [estado, acao, pendente] = useActionState<EstadoTramitacao, FormData>(
    excluirMovimento,
    undefined,
  );

  return (
    <div className="flex flex-col gap-1">
      <form action={acao}>
        <input type="hidden" name="movimentoId" value={movimentoId} />
        <button
          type="submit"
          disabled={pendente}
          className="text-xs text-[var(--danger)] underline underline-offset-2 disabled:opacity-60"
        >
          {pendente ? "Excluindo…" : "Excluir"}
        </button>
      </form>
      {estado?.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
    </div>
  );
}
