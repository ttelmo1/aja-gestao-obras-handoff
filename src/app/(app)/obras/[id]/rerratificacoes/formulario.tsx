"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Alerta, Botao, Campo, classeInput } from "@/components/ui/formulario";
import type { StatusRerratificacao } from "@/generated/prisma/enums";
import {
  ROTULOS_STATUS_RERRATIFICACAO,
  STATUS_RERRATIFICACAO,
} from "@/modules/rerratificacoes/rotulos";

import {
  excluirRerratificacao,
  salvarRerratificacao,
  type EstadoRerratificacao,
} from "./acoes";

export type RerratificacaoNoFormulario = {
  id: string;
  numero: number;
  data: string | null;
  protocolo: string | null;
  descricao: string | null;
  quantidadeItens: number | null;
  percentualAlcancado: string;
  valorImpactado: string;
  prazoAdicionalDias: number | null;
  status: StatusRerratificacao;
  observacoes: string | null;
};

/**
 * Formulário da rerratificação — só o resultado agregado.
 *
 * Não existe campo de item alterado, e é de propósito: o detalhamento vive na
 * planilha que vai ao órgão, anexada aqui como documento (requisitos.md 1.7
 * `[AJUSTADO]`). O que o sistema guarda é o impacto: percentual, valor e
 * prazo.
 */
export function FormularioRerratificacao({
  obraId,
  padrao,
  numeroSugerido,
}: {
  obraId: string;
  padrao?: RerratificacaoNoFormulario;
  numeroSugerido: number;
}) {
  const [estado, acao, pendente] = useActionState<EstadoRerratificacao, FormData>(
    salvarRerratificacao,
    undefined,
  );

  return (
    <form action={acao} className="flex flex-col gap-5">
      <input type="hidden" name="obraId" value={obraId} />
      {padrao && <input type="hidden" name="id" value={padrao.id} />}

      <div className="grid gap-4 sm:grid-cols-3">
        <Campo id="numero" rotulo="Número">
          <input
            id="numero"
            name="numero"
            type="number"
            min={1}
            required
            defaultValue={padrao?.numero ?? numeroSugerido}
            className={`${classeInput} tabular`}
          />
        </Campo>

        <Campo id="data" rotulo="Data">
          <input
            id="data"
            name="data"
            type="date"
            defaultValue={padrao?.data ?? ""}
            className={classeInput}
          />
        </Campo>

        <Campo id="status" rotulo="Situação">
          <select
            id="status"
            name="status"
            defaultValue={padrao?.status ?? "EM_ELABORACAO"}
            className={classeInput}
          >
            {STATUS_RERRATIFICACAO.map((s) => (
              <option key={s} value={s}>
                {ROTULOS_STATUS_RERRATIFICACAO[s]}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <Campo
        id="descricao"
        rotulo="Descrição"
        dica="O que a rerratificação mudou, em uma linha."
      >
        <input
          id="descricao"
          name="descricao"
          defaultValue={padrao?.descricao ?? ""}
          placeholder="Ajuste de quantitativos e serviços"
          className={classeInput}
        />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="protocolo" rotulo="Nº do protocolo">
          <input
            id="protocolo"
            name="protocolo"
            defaultValue={padrao?.protocolo ?? ""}
            className={classeInput}
          />
        </Campo>

        <Campo
          id="quantidadeItens"
          rotulo="Itens alterados"
          dica="Só a contagem — o item a item fica na planilha anexada."
        >
          <input
            id="quantidadeItens"
            name="quantidadeItens"
            type="number"
            min={1}
            defaultValue={padrao?.quantidadeItens ?? ""}
            className={`${classeInput} tabular`}
          />
        </Campo>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Campo
          id="valorImpactado"
          rotulo="Valor impactado (R$)"
          dica="Negativo em caso de supressão."
        >
          <input
            id="valorImpactado"
            name="valorImpactado"
            required
            inputMode="decimal"
            defaultValue={padrao?.valorImpactado}
            placeholder="120.000,00"
            className={`${classeInput} tabular`}
          />
        </Campo>

        <Campo
          id="percentualAlcancado"
          rotulo="Percentual alcançado (%)"
          dica="O que consta na planilha apresentada ao órgão."
        >
          <input
            id="percentualAlcancado"
            name="percentualAlcancado"
            required
            inputMode="decimal"
            defaultValue={padrao?.percentualAlcancado}
            placeholder="10,00"
            className={`${classeInput} tabular`}
          />
        </Campo>

        <Campo id="prazoAdicionalDias" rotulo="Prazo adicional (dias)">
          <input
            id="prazoAdicionalDias"
            name="prazoAdicionalDias"
            type="number"
            min={1}
            defaultValue={padrao?.prazoAdicionalDias ?? ""}
            className={`${classeInput} tabular`}
          />
        </Campo>
      </div>

      <Campo id="observacoes" rotulo="Observações">
        <textarea
          id="observacoes"
          name="observacoes"
          rows={3}
          defaultValue={padrao?.observacoes ?? ""}
          placeholder="Sem alteração do prazo contratual."
          className={`${classeInput} min-h-24`}
        />
      </Campo>

      {estado?.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      {estado?.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}

      <div className="flex items-center gap-3">
        <Botao type="submit" disabled={pendente}>
          {pendente
            ? "Salvando…"
            : padrao
              ? "Salvar alterações"
              : "Registrar rerratificação"}
        </Botao>
        <Link
          href={`/obras/${obraId}/rerratificacoes`}
          className="text-sm text-[var(--muted)] underline underline-offset-2"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

export function BotaoExcluirRerratificacao({ id }: { id: string }) {
  const [estado, acao, pendente] = useActionState<EstadoRerratificacao, FormData>(
    excluirRerratificacao,
    undefined,
  );

  return (
    <div className="flex flex-col gap-2">
      <form action={acao}>
        <input type="hidden" name="id" value={id} />
        <Botao type="submit" variante="perigo" disabled={pendente}>
          {pendente ? "Excluindo…" : "Excluir rerratificação"}
        </Botao>
      </form>
      {estado?.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
    </div>
  );
}
