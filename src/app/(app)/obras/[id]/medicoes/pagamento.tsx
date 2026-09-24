"use client";

import { useActionState, useState } from "react";

import { classeCampo } from "@/components/ui/formulario";

import { desfazerPagamento, marcarComoPaga, type EstadoMedicao } from "./acoes";

/**
 * Coluna "Pagamento" da tabela de medições — pedido de 24/09/2026: marcar como
 * paga na própria linha, com a data ao lado.
 *
 * Fechado, é um link discreto: a tabela já tem doze colunas, e um campo de
 * data aberto em cada linha a deixaria larga demais. O clique abre a data
 * (hoje, por padrão) e o confirmar.
 */
export function PagamentoDaMedicao({
  medicaoId,
  paga,
  dataPagamento,
  podeMarcar,
  podeEditar,
  hoje,
}: {
  medicaoId: string;
  paga: boolean;
  /** Já formatada, "24/09/2026". */
  dataPagamento: string | null;
  /** A situação permite pagar — ver `podeMarcarComoPaga`. */
  podeMarcar: boolean;
  /** O perfil do usuário permite editar medição. */
  podeEditar: boolean;
  /** "2026-09-24", no fuso de Brasília — calculado no servidor. */
  hoje: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [estadoPagar, pagar, pagando] = useActionState<EstadoMedicao, FormData>(
    marcarComoPaga,
    undefined,
  );
  const [estadoDesfazer, desfazer, desfazendo] = useActionState<
    EstadoMedicao,
    FormData
  >(desfazerPagamento, undefined);

  const erro = estadoPagar?.erro ?? estadoDesfazer?.erro;
  const mensagemErro = erro && (
    <span role="alert" className="block text-[11px] text-[var(--danger)]">
      {erro}
    </span>
  );

  if (paga) {
    return (
      <div className="flex flex-col gap-0.5 whitespace-nowrap">
        <span className="tabular">{dataPagamento ?? "—"}</span>
        {podeEditar && (
          <form action={desfazer}>
            <input type="hidden" name="id" value={medicaoId} />
            <button
              type="submit"
              disabled={desfazendo}
              className="text-[11px] text-[var(--muted)] underline underline-offset-2 disabled:opacity-60"
            >
              {desfazendo ? "Desfazendo…" : "Desfazer"}
            </button>
          </form>
        )}
        {mensagemErro}
      </div>
    );
  }

  if (!podeMarcar || !podeEditar) {
    return <span className="text-[var(--muted)]">—</span>;
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-[12px] font-bold whitespace-nowrap text-[var(--primary)] underline underline-offset-2"
      >
        Marcar como paga
      </button>
    );
  }

  return (
    <form action={pagar} className="flex flex-col gap-1.5">
      <input type="hidden" name="id" value={medicaoId} />
      <input
        type="date"
        name="dataPagamento"
        aria-label="Data do pagamento"
        required
        defaultValue={hoje}
        max={hoje}
        className={`${classeCampo} px-2 py-1.5 text-[13px]`}
      />
      <div className="flex gap-2 whitespace-nowrap">
        <button
          type="submit"
          disabled={pagando}
          className="rounded-md bg-[var(--primary)] px-2.5 py-1 text-[12px] font-bold text-white disabled:opacity-60"
        >
          {pagando ? "Salvando…" : "Confirmar"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="text-[12px] text-[var(--muted)] underline underline-offset-2"
        >
          Cancelar
        </button>
      </div>
      {mensagemErro}
    </form>
  );
}
