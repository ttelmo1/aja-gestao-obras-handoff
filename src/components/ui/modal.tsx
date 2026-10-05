"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import { useEnvioSemReset } from "./envio-sem-reset";
import { Alerta, Botao } from "./formulario";

type Estado = { erro?: string; sucesso?: string } | undefined;

/**
 * Janela com formulário, aberta por um gatilho na própria linha da tabela.
 *
 * Existe para as ações que pertencem a uma linha mas precisam de campos:
 * incluir o arquivo de um tipo, dizer o motivo de uma dispensa. Antes elas
 * moravam em blocos soltos no fim da página — o usuário escolhia o tipo de
 * novo num seletor, longe da linha que estava olhando.
 *
 * `<dialog>` nativo: foco preso na janela, Esc fecha, fundo inerte, sem
 * biblioteca e sem internet. O envio usa `useEnvioSemReset` porque a action
 * pode recusar o arquivo — e um erro que apagasse a descrição já digitada
 * obrigaria a refazer tudo. Em caso de sucesso a janela se fecha sozinha: a
 * página já foi revalidada e a linha atualizada está atrás dela.
 */
export function ModalFormulario({
  acao,
  campos,
  titulo,
  descricao,
  rotuloEnvio,
  rotuloEnviando,
  varianteEnvio = "primario",
  gatilho,
  children,
}: {
  acao: (estado: Estado, dados: FormData) => Promise<Estado>;
  /** Campos ocultos: ids e o tipo da linha. */
  campos: Record<string, string | undefined>;
  titulo: string;
  descricao?: ReactNode;
  rotuloEnvio: string;
  rotuloEnviando: string;
  varianteEnvio?: "primario" | "destaque" | "secundario" | "perigo";
  gatilho: ReactNode;
  /** Os campos visíveis da janela. */
  children?: ReactNode;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();
  const [estado, aoEnviar, pendente] = useEnvioSemReset<Estado>(acao, undefined);

  useEffect(() => {
    if (estado?.sucesso) dialogo.current?.close();
  }, [estado]);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogo.current?.showModal()}
        className="rounded-md text-left text-sm font-bold text-[var(--primary)] underline underline-offset-2 hover:text-[var(--primary-hover)]"
      >
        {gatilho}
      </button>

      <dialog
        ref={dialogo}
        aria-labelledby={idTitulo}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--foreground)] shadow-[var(--sombra-hover)] backdrop:bg-[var(--navy)]/40"
      >
        <form onSubmit={aoEnviar} className="flex flex-col gap-4 p-5">
          {Object.entries(campos).map(
            ([nome, valor]) =>
              valor && (
                <input key={nome} type="hidden" name={nome} value={valor} />
              ),
          )}

          <h2 id={idTitulo} className="text-base font-bold text-[var(--primary)]">
            {titulo}
          </h2>

          {descricao && (
            <p className="text-sm text-[var(--muted)]">{descricao}</p>
          )}

          {children}

          {estado?.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}

          <div className="flex flex-wrap justify-end gap-3">
            <Botao
              type="button"
              variante="secundario"
              onClick={() => dialogo.current?.close()}
              disabled={pendente}
            >
              Cancelar
            </Botao>
            <Botao type="submit" variante={varianteEnvio} disabled={pendente}>
              {pendente ? rotuloEnviando : rotuloEnvio}
            </Botao>
          </div>
        </form>
      </dialog>
    </>
  );
}
