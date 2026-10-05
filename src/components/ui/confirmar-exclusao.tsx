"use client";

import { Fragment, useActionState, useId, useRef, type ReactNode } from "react";

import { Alerta, Botao } from "./formulario";

type Estado = { erro?: string; sucesso?: string } | undefined;

export type DetalheExclusao = { rotulo: string; valor: string };

/**
 * Exclusão com janela de confirmação.
 *
 * A exclusão física não tem volta, então o clique não apaga: abre uma janela
 * que mostra **qual** registro vai sair — número, competência, valor —, para
 * que ninguém apague a medição 03 achando que era a 02. Quando já se sabe que
 * a exclusão será recusada (`bloqueio`), a janela explica o motivo e não
 * oferece o botão; a action confere de novo, porque a tela pode estar velha.
 *
 * `<dialog>` nativo: foco preso na janela, Esc fecha e o fundo fica inerte sem
 * biblioteca nenhuma — e sem depender de internet.
 */
export function ConfirmarExclusao({
  acao,
  campos,
  titulo,
  detalhes,
  bloqueio,
  aviso,
  gatilho,
  rotuloGatilho,
}: {
  acao: (estado: Estado, dados: FormData) => Promise<Estado>;
  campos: Record<string, string>;
  titulo: string;
  detalhes: DetalheExclusao[];
  bloqueio?: string | null;
  aviso?: ReactNode;
  gatilho: "link" | "botao";
  rotuloGatilho: string;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();
  const [estado, despachar, pendente] = useActionState<Estado, FormData>(
    acao,
    undefined,
  );

  const abrir = () => dialogo.current?.showModal();
  const fechar = () => dialogo.current?.close();

  return (
    <>
      {gatilho === "link" ? (
        <button
          type="button"
          onClick={abrir}
          className="text-xs text-[var(--danger)] underline underline-offset-2"
        >
          {rotuloGatilho}
        </button>
      ) : (
        <div>
          <Botao type="button" variante="perigo" onClick={abrir}>
            {rotuloGatilho}
          </Botao>
        </div>
      )}

      <dialog
        ref={dialogo}
        aria-labelledby={idTitulo}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--foreground)] shadow-[var(--sombra-hover)] backdrop:bg-[var(--navy)]/40"
      >
        <form action={despachar} className="flex flex-col gap-4 p-5">
          {Object.entries(campos).map(([nome, valor]) => (
            <input key={nome} type="hidden" name={nome} value={valor} />
          ))}

          <h2 id={idTitulo} className="text-base font-bold text-[var(--primary)]">
            {titulo}
          </h2>

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            {detalhes.map((d) => (
              <Fragment key={d.rotulo}>
                <dt className="text-[var(--muted)]">{d.rotulo}</dt>
                <dd className="font-bold break-words">{d.valor}</dd>
              </Fragment>
            ))}
          </dl>

          {bloqueio ? (
            <Alerta tipo="erro">{bloqueio}</Alerta>
          ) : (
            aviso && <p className="text-sm text-[var(--muted)]">{aviso}</p>
          )}
          {estado?.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}

          <div className="flex flex-wrap justify-end gap-3">
            <Botao
              type="button"
              variante="secundario"
              onClick={fechar}
              disabled={pendente}
            >
              {bloqueio ? "Fechar" : "Cancelar"}
            </Botao>
            {!bloqueio && (
              <Botao type="submit" variante="perigo" disabled={pendente}>
                {pendente ? "Excluindo…" : "Excluir"}
              </Botao>
            )}
          </div>
        </form>
      </dialog>
    </>
  );
}
