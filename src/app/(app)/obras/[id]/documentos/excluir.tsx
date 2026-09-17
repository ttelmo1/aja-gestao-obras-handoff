"use client";

import { useActionState } from "react";

import { Alerta } from "@/components/ui/formulario";

import { excluirDocumento, type EstadoDocumento } from "./acoes";

/**
 * Exclusão lógica: some da tela, permanece na auditoria.
 *
 * A tipografia é a mesma de "Abrir" e "Incluir" — só a cor muda. Enquanto este
 * botão era `text-xs` sem negrito, ele saía menor e fora da linha de base dos
 * vizinhos, e a coluna "Ação" parecia desalinhada.
 */
export function BotaoExcluirDocumento({ documentoId }: { documentoId: string }) {
  const [estado, acao, pendente] = useActionState<EstadoDocumento, FormData>(
    excluirDocumento,
    undefined,
  );

  return (
    <form action={acao} className="contents">
      <input type="hidden" name="documentoId" value={documentoId} />
      <button
        type="submit"
        disabled={pendente}
        className="text-sm font-bold text-[var(--danger)] underline underline-offset-2 disabled:opacity-60"
      >
        {pendente ? "Excluindo…" : "Excluir"}
      </button>
      {estado?.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
    </form>
  );
}
