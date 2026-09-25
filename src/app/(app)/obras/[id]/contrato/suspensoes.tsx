"use client";

import { useActionState, useEffect, useState } from "react";

import { ConfirmarExclusao } from "@/components/ui/confirmar-exclusao";
import { Alerta, Botao, Campo, classeInput } from "@/components/ui/formulario";
import { Celula, Linha, Tabela } from "@/components/ui/tabela";

import {
  excluirSuspensao,
  salvarSuspensao,
  type EstadoSuspensao,
} from "./suspensoes-acoes";

/** Uma suspensão já formatada no servidor. */
export type SuspensaoNaTela = {
  id: string;
  /** "2026-09-24", para o campo de data. */
  dataInicio: string;
  dataFim: string | null;
  /** "24/09/2026", para a tabela. */
  inicioFormatado: string;
  fimFormatado: string | null;
  dias: number;
  emCurso: boolean;
  observacoes: string | null;
};

/**
 * Suspensões de prazo da obra, na aba Contrato — pedido de 24/09/2026:
 * *"ter a opção de colocar a suspensão (que pode ser mais de uma) com a data
 * de início e data final"*. Cada linha edita no lugar; a nova entra pelo
 * formulário do fim.
 */
export function SuspensoesDePrazo({
  obraId,
  suspensoes,
}: {
  obraId: string;
  suspensoes: SuspensaoNaTela[];
}) {
  const [editando, setEditando] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {suspensoes.length > 0 && (
        <Tabela colunas={["Início", "Data final", "Dias", "Observação", ""]}>
          {suspensoes.map((s) =>
            editando === s.id ? (
              <Linha key={s.id}>
                <td colSpan={5} className="px-3 py-3">
                  <FormularioSuspensao
                    obraId={obraId}
                    suspensao={s}
                    aoTerminar={() => setEditando(null)}
                  />
                </td>
              </Linha>
            ) : (
              <Linha key={s.id}>
                <Celula>{s.inicioFormatado}</Celula>
                <Celula>
                  {s.fimFormatado ?? (
                    <span className="font-bold text-[var(--warning-fg)]">
                      em aberto
                    </span>
                  )}
                </Celula>
                <Celula tabular>
                  {s.dias}
                  {s.emCurso && (
                    <span className="block text-[11px] text-[var(--muted)]">
                      em curso
                    </span>
                  )}
                </Celula>
                <Celula apagada>
                  <span className="whitespace-pre-line">{s.observacoes ?? "—"}</span>
                </Celula>
                <Celula>
                  <div className="flex gap-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setEditando(s.id)}
                      className="text-xs text-[var(--primary)] underline underline-offset-2"
                    >
                      Editar
                    </button>
                    <ConfirmarExclusao
                      acao={excluirSuspensao}
                      campos={{ id: s.id }}
                      titulo="Excluir esta suspensão?"
                      detalhes={[
                        { rotulo: "Início", valor: s.inicioFormatado },
                        { rotulo: "Data final", valor: s.fimFormatado ?? "em aberto" },
                        { rotulo: "Dias", valor: String(s.dias) },
                      ]}
                      aviso="Os dias desta suspensão deixam de adiar o término e a próxima medição. A auditoria continua registrando a exclusão."
                      gatilho="link"
                      rotuloGatilho="Excluir"
                    />
                  </div>
                </Celula>
              </Linha>
            ),
          )}
        </Tabela>
      )}

      <div className={suspensoes.length > 0 ? "border-t border-[var(--border)] pt-4" : ""}>
        <p className="mb-3 text-[11px] font-bold tracking-wide text-[var(--muted)] uppercase">
          Nova suspensão
        </p>
        <FormularioSuspensao obraId={obraId} />
      </div>
    </div>
  );
}

function FormularioSuspensao({
  obraId,
  suspensao,
  aoTerminar,
}: {
  obraId: string;
  suspensao?: SuspensaoNaTela;
  aoTerminar?: () => void;
}) {
  const [estado, acao, pendente] = useActionState<EstadoSuspensao, FormData>(
    salvarSuspensao,
    undefined,
  );

  // Na edição, salvar fecha a linha; na nova, o formulário fica para a
  // próxima (o React já o limpa depois da action).
  useEffect(() => {
    if (estado?.sucesso && aoTerminar) aoTerminar();
  }, [estado, aoTerminar]);

  const prefixo = suspensao ? `susp-${suspensao.id}` : "susp-nova";

  return (
    <form action={acao} className="flex flex-col gap-3">
      <input type="hidden" name="obraId" value={obraId} />
      {suspensao && <input type="hidden" name="id" value={suspensao.id} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo
          id={`${prefixo}-inicio`}
          rotulo="Data de início"
          dica="O prazo para de contar neste dia."
        >
          <input
            id={`${prefixo}-inicio`}
            name="dataInicio"
            type="date"
            required
            defaultValue={suspensao?.dataInicio ?? ""}
            className={classeInput}
          />
        </Campo>
        <Campo
          id={`${prefixo}-fim`}
          rotulo="Data final"
          dica="O prazo volta a contar neste dia. Em branco enquanto a obra continuar suspensa."
        >
          <input
            id={`${prefixo}-fim`}
            name="dataFim"
            type="date"
            defaultValue={suspensao?.dataFim ?? ""}
            className={classeInput}
          />
        </Campo>
      </div>

      <Campo id={`${prefixo}-obs`} rotulo="Observação">
        <textarea
          id={`${prefixo}-obs`}
          name="observacoes"
          rows={2}
          defaultValue={suspensao?.observacoes ?? ""}
          className={classeInput}
        />
      </Campo>

      {estado?.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      {!suspensao && estado?.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}

      <div className="flex items-center gap-3">
        <Botao type="submit" variante="secundario" disabled={pendente}>
          {pendente ? "Salvando…" : suspensao ? "Salvar" : "Lançar suspensão"}
        </Botao>
        {aoTerminar && (
          <button
            type="button"
            onClick={aoTerminar}
            className="text-sm text-[var(--muted)] underline underline-offset-2"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
