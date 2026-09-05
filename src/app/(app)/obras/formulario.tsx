"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Alerta, Botao, Campo, classeInput } from "@/components/ui/formulario";
import type { PeriodicidadeMedicao, StatusObra } from "@/generated/prisma/enums";
import {
  PERIODICIDADES,
  ROTULOS_PERIODICIDADE,
} from "@/modules/medicoes/periodicidade";
import { ROTULOS_STATUS, STATUS_OBRA } from "@/modules/obras/filtros";

import { excluirObra, salvarObra, type EstadoObra } from "./acoes";

export type ObraNoFormulario = {
  id: string;
  codigo: string;
  objeto: string;
  numeroContrato: string;
  numeroProcesso: string | null;
  contratanteId: string;
  responsavelId: string | null;
  valorContratado: string;
  dataAssinatura: string | null;
  dataOrdemInicio: string | null;
  prazoDias: number | null;
  dataPrevistaTermino: string | null;
  dataTerminoReal: string | null;
  status: StatusObra;
  periodicidadeMedicao: PeriodicidadeMedicao;
  intervaloMedicaoDias: number | null;
  observacoes: string | null;
};

type Opcao = { id: string; nome: string };

/**
 * Formulário de obra, usado tanto para cadastrar quanto para editar.
 *
 * Os campos de contrato ficam junto dos da obra porque, nesta modelagem, obra
 * e contrato são a mesma entidade. Era suposição; o engenheiro do cliente
 * confirmou em 04/09/2026 que é um contrato por obra, sem lotes, contratos
 * complementares nem guarda-chuva — ponto 4 de `docs/pontos-para-reuniao.md`,
 * agora fechado.
 */
export function FormularioObra({
  padrao,
  contratantes,
  responsaveis,
}: {
  padrao?: ObraNoFormulario;
  contratantes: Opcao[];
  responsaveis: Opcao[];
}) {
  const [estado, acao, pendente] = useActionState<EstadoObra, FormData>(
    salvarObra,
    undefined,
  );

  return (
    <form action={acao} className="flex flex-col gap-5">
      {padrao && <input type="hidden" name="id" value={padrao.id} />}

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-[11px] font-bold tracking-wide text-[var(--muted)] uppercase">
          Identificação
        </legend>

        <Campo
          id="objeto"
          rotulo="Objeto da obra"
          dica="Descrição que aparece no painel e nos relatórios."
        >
          <input
            id="objeto"
            name="objeto"
            required
            minLength={5}
            defaultValue={padrao?.objeto}
            className={classeInput}
          />
        </Campo>

        <div className="grid gap-4 sm:grid-cols-3">
          <Campo
            id="codigo"
            rotulo="Código interno"
            dica={padrao ? undefined : "Em branco, o sistema numera sozinho."}
          >
            <input
              id="codigo"
              name="codigo"
              defaultValue={padrao?.codigo}
              placeholder="OBR-2026-001"
              className={classeInput}
            />
          </Campo>

          <Campo id="numeroContrato" rotulo="Número do contrato">
            <input
              id="numeroContrato"
              name="numeroContrato"
              required
              defaultValue={padrao?.numeroContrato}
              placeholder="015/2026"
              className={classeInput}
            />
          </Campo>

          <Campo id="numeroProcesso" rotulo="Processo / protocolo">
            <input
              id="numeroProcesso"
              name="numeroProcesso"
              defaultValue={padrao?.numeroProcesso ?? ""}
              className={classeInput}
            />
          </Campo>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="contratanteId" rotulo="Contratante">
            <select
              id="contratanteId"
              name="contratanteId"
              required
              defaultValue={padrao?.contratanteId ?? ""}
              className={classeInput}
            >
              <option value="">Selecione…</option>
              {contratantes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </Campo>

          <Campo id="responsavelId" rotulo="Responsável técnico">
            <select
              id="responsavelId"
              name="responsavelId"
              defaultValue={padrao?.responsavelId ?? ""}
              className={classeInput}
            >
              <option value="">Não definido</option>
              {responsaveis.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
            </select>
          </Campo>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-t border-[var(--border)] pt-5">
        <legend className="mb-2 text-[11px] font-bold tracking-wide text-[var(--muted)] uppercase">
          Contrato e prazo
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="valorContratado" rotulo="Valor contratado (R$)">
            <input
              id="valorContratado"
              name="valorContratado"
              required
              inputMode="decimal"
              defaultValue={padrao?.valorContratado}
              placeholder="1.200.000,00"
              className={`${classeInput} tabular`}
            />
          </Campo>

          <Campo id="status" rotulo="Situação">
            <select
              id="status"
              name="status"
              defaultValue={padrao?.status ?? "PLANEJAMENTO"}
              className={classeInput}
            >
              {STATUS_OBRA.map((s) => (
                <option key={s} value={s}>
                  {ROTULOS_STATUS[s]}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="dataAssinatura" rotulo="Assinatura do contrato">
            <input
              id="dataAssinatura"
              name="dataAssinatura"
              type="date"
              defaultValue={padrao?.dataAssinatura ?? ""}
              className={classeInput}
            />
          </Campo>

          <Campo id="dataOrdemInicio" rotulo="Ordem de início">
            <input
              id="dataOrdemInicio"
              name="dataOrdemInicio"
              type="date"
              defaultValue={padrao?.dataOrdemInicio ?? ""}
              className={classeInput}
            />
          </Campo>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Campo id="prazoDias" rotulo="Prazo (dias)">
            <input
              id="prazoDias"
              name="prazoDias"
              type="number"
              min={1}
              defaultValue={padrao?.prazoDias ?? ""}
              className={`${classeInput} tabular`}
            />
          </Campo>

          <Campo
            id="dataPrevistaTermino"
            rotulo="Término previsto"
            dica="Em branco, o sistema calcula pela ordem de início + prazo."
          >
            <input
              id="dataPrevistaTermino"
              name="dataPrevistaTermino"
              type="date"
              defaultValue={padrao?.dataPrevistaTermino ?? ""}
              className={classeInput}
            />
          </Campo>

          <Campo id="dataTerminoReal" rotulo="Término real">
            <input
              id="dataTerminoReal"
              name="dataTerminoReal"
              type="date"
              defaultValue={padrao?.dataTerminoReal ?? ""}
              className={classeInput}
            />
          </Campo>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            id="periodicidadeMedicao"
            rotulo="Periodicidade da medição"
            dica="Define quando a próxima medição vence e alimenta o indicador de medições atrasadas."
          >
            <select
              id="periodicidadeMedicao"
              name="periodicidadeMedicao"
              defaultValue={padrao?.periodicidadeMedicao ?? "MENSAL"}
              className={classeInput}
            >
              {PERIODICIDADES.map((p) => (
                <option key={p} value={p}>
                  {ROTULOS_PERIODICIDADE[p]}
                </option>
              ))}
            </select>
          </Campo>

          <Campo
            id="intervaloMedicaoDias"
            rotulo="Intervalo (dias)"
            dica="Obrigatório apenas quando a periodicidade é personalizada."
          >
            <input
              id="intervaloMedicaoDias"
              name="intervaloMedicaoDias"
              type="number"
              min={1}
              defaultValue={padrao?.intervaloMedicaoDias ?? ""}
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
            className={`${classeInput} min-h-24`}
          />
        </Campo>
      </fieldset>

      {estado?.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      {estado?.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}

      <div className="flex items-center gap-3">
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : padrao ? "Salvar alterações" : "Cadastrar obra"}
        </Botao>
        <Link
          href={padrao ? `/obras/${padrao.id}` : "/obras"}
          className="text-sm text-[var(--muted)] underline underline-offset-2"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

/**
 * Excluir obra é separado do formulário e só aparece para quem tem a
 * permissão. A ação recusa quando há medições, documentos ou rerratificações.
 */
export function BotaoExcluirObra({ id }: { id: string }) {
  const [estado, acao, pendente] = useActionState<EstadoObra, FormData>(
    excluirObra,
    undefined,
  );

  return (
    <div className="flex flex-col gap-2">
      <form action={acao}>
        <input type="hidden" name="id" value={id} />
        <Botao type="submit" variante="perigo" disabled={pendente}>
          {pendente ? "Excluindo…" : "Excluir obra"}
        </Botao>
      </form>
      {estado?.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
    </div>
  );
}
