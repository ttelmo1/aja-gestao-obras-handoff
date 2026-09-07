"use client";

import { useActionState } from "react";

import { Alerta } from "@/components/ui/formulario";

import { excluirDocumento, type EstadoDocumento } from "./acoes";

/** Exclusão lógica: some da tela, permanece na auditoria. */
export function BotaoExcluirDocumento({ documentoId }: { documentoId: string }) {
  const [estado, acao, pendente] = useActionState<EstadoDocumento, FormData>(
    excluirDocumento,
    undefined,
  );

  return (
    <div className="flex flex-col gap-1">
      <form action={acao}>
        <input type="hidden" name="documentoId" value={documentoId} />
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
