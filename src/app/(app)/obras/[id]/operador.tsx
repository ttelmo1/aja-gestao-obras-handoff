"use client";

import { useActionState } from "react";

import { Alerta, Botao, classeInput } from "@/components/ui/formulario";
import { formatarData } from "@/lib/date-br";
import {
  MAX_OBSERVACAO_OPERADOR,
  type SituacaoOperador,
} from "@/modules/obras/operador";

import {
  assumirObra,
  liberarObra,
  type EstadoOperador,
} from "./operador-acoes";

/**
 * Bloco do operador na aba Resumo — onde a atribuição acontece.
 *
 * Não está no cadastro do contrato de propósito: quem assume é o próprio
 * operador, no momento em que pega a obra, e não um chefe no cadastro. Ver
 * `modules/obras/operador.ts` para o porquê.
 *
 * A tela só é renderizada quando o farol está em atenção ou crítico — em obra
 * verde não há o que assumir.
 */
export function BlocoOperador({
  obraId,
  situacao,
  souEu,
}: {
  obraId: string;
  situacao: SituacaoOperador;
  /** A obra está assumida por quem está olhando a tela. */
  souEu: boolean;
}) {
  const [estado, acao, pendente] = useActionState<EstadoOperador, FormData>(
    assumirObra,
    undefined,
  );
  const [estadoLiberar, acaoLiberar, liberando] = useActionState<
    EstadoOperador,
    FormData
  >(liberarObra, undefined);

  const mensagem = estado ?? estadoLiberar;

  return (
    <div className="flex flex-col gap-3">
      {mensagem?.erro && <Alerta tipo="erro">{mensagem.erro}</Alerta>}
      {mensagem?.sucesso && <Alerta tipo="sucesso">{mensagem.sucesso}</Alerta>}

      {situacao.assumida ? (
        <p className="text-sm">
          <strong>{situacao.nome}</strong> assumiu esta obra
          {situacao.desde && ` em ${formatarData(situacao.desde)}`}.
          {situacao.observacao && (
            <span className="mt-1 block whitespace-pre-line text-[var(--muted)]">
              {situacao.observacao}
            </span>
          )}
        </p>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          Ninguém assumiu esta obra.
          {situacao.ultimoQueMexeu && (
            <>
              {" "}
              Último a mexer: <strong>{situacao.nome}</strong>
              {situacao.liberadaEm && `, em ${formatarData(situacao.liberadaEm)}`}.
            </>
          )}
        </p>
      )}

      {souEu && situacao.assumida ? (
        <div className="flex flex-col gap-3">
          <form action={acao} className="flex flex-col gap-2">
            <input type="hidden" name="obraId" value={obraId} />
            <label
              htmlFor="operadorObservacao"
              className="text-[11px] font-bold tracking-wide text-[var(--muted)] uppercase"
            >
              Observação
            </label>
            <textarea
              id="operadorObservacao"
              name="operadorObservacao"
              rows={2}
              maxLength={MAX_OBSERVACAO_OPERADOR}
              defaultValue={situacao.observacao ?? ""}
              placeholder="Aguardando foto da obra, relatório do engenheiro…"
              className={classeInput}
            />
            <div className="flex gap-2">
              <Botao type="submit" variante="secundario" disabled={pendente}>
                {pendente ? "Salvando…" : "Salvar observação"}
              </Botao>
            </div>
          </form>

          <form action={acaoLiberar}>
            <input type="hidden" name="obraId" value={obraId} />
            <Botao type="submit" variante="secundario" disabled={liberando}>
              {liberando ? "Liberando…" : "Liberar obra"}
            </Botao>
          </form>
        </div>
      ) : (
        !situacao.assumida && (
          <form action={acao} className="flex flex-col gap-2">
            <input type="hidden" name="obraId" value={obraId} />
            <label
              htmlFor="operadorObservacao"
              className="text-[11px] font-bold tracking-wide text-[var(--muted)] uppercase"
            >
              Observação (opcional)
            </label>
            <textarea
              id="operadorObservacao"
              name="operadorObservacao"
              rows={2}
              maxLength={MAX_OBSERVACAO_OPERADOR}
              placeholder="Aguardando foto da obra, relatório do engenheiro…"
              className={classeInput}
            />
            <div>
              <Botao type="submit" variante="destaque" disabled={pendente}>
                {pendente ? "Assumindo…" : "Assumir esta obra"}
              </Botao>
            </div>
          </form>
        )
      )}
    </div>
  );
}
