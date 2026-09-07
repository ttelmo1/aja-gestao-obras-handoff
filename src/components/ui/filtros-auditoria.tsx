import Link from "next/link";

import { classeInput } from "@/components/ui/formulario";
import { dataParaIso } from "@/lib/date-br";
import {
  queryDaPagina,
  type FiltrosAuditoria,
} from "@/modules/auditoria/filtros";
import {
  ACOES_AUDITORIA,
  ENTIDADES_AUDITAVEIS,
  ROTULOS_ACAO,
  rotuloDaEntidade,
} from "@/modules/auditoria/rotulos";

/**
 * Filtros da trilha, compartilhados pela aba da obra e pela tela geral.
 *
 * `<form method="get">` puro, como o resto do sistema: o filtro vira query na
 * URL, dá para mandar o link para alguém e o botão voltar funciona.
 */
export function BarraDeFiltrosAuditoria({
  base,
  filtros,
  total,
  usuarios,
}: {
  base: string;
  filtros: FiltrosAuditoria;
  total: number;
  /** Só a tela geral filtra por autor; na obra o recorte já é outro. */
  usuarios?: Array<{ id: string; nome: string }>;
}) {
  return (
    <form method="get" action={base} className="grid gap-3 sm:grid-cols-4">
      <input
        type="search"
        name="busca"
        defaultValue={filtros.busca}
        placeholder="Buscar por descrição ou autor"
        aria-label="Buscar no histórico"
        className={`${classeInput} sm:col-span-2`}
      />

      <select
        name="acao"
        defaultValue={filtros.acao ?? ""}
        aria-label="Ação"
        className={classeInput}
      >
        <option value="">Todas as ações</option>
        {ACOES_AUDITORIA.map((a) => (
          <option key={a} value={a}>
            {ROTULOS_ACAO[a]}
          </option>
        ))}
      </select>

      <select
        name="entidade"
        defaultValue={filtros.entidade ?? ""}
        aria-label="Tipo de registro"
        className={classeInput}
      >
        <option value="">Todos os registros</option>
        {ENTIDADES_AUDITAVEIS.map((e) => (
          <option key={e} value={e}>
            {rotuloDaEntidade(e)}
          </option>
        ))}
      </select>

      {usuarios && (
        <select
          name="usuario"
          defaultValue={filtros.usuarioId ?? ""}
          aria-label="Autor"
          className={`${classeInput} sm:col-span-2`}
        >
          <option value="">Todos os autores</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome}
            </option>
          ))}
        </select>
      )}

      <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
        De
        <input
          type="date"
          name="de"
          defaultValue={filtros.de ? dataParaIso(filtros.de) : ""}
          className={classeInput}
        />
      </label>
      <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
        Até
        <input
          type="date"
          name="ate"
          defaultValue={filtros.ate ? dataParaIso(filtros.ate) : ""}
          className={classeInput}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3 sm:col-span-4">
        <button
          type="submit"
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm font-bold text-[var(--primary)] transition-colors hover:bg-[var(--background)]"
        >
          Filtrar
        </button>
        <Link
          href={base}
          className="text-sm text-[var(--muted)] underline underline-offset-2"
        >
          Limpar
        </Link>
        <span className="ml-auto text-sm text-[var(--muted)]">
          {total} registro(s)
        </span>
      </div>
    </form>
  );
}

/**
 * A trilha só cresce e nunca é apagada — sem paginação, a tela ficaria
 * inutilizável no primeiro ano de uso.
 */
export function PaginacaoAuditoria({
  base,
  filtros,
  ultimaPagina,
}: {
  base: string;
  filtros: FiltrosAuditoria;
  ultimaPagina: number;
}) {
  if (ultimaPagina <= 1) return null;
  return (
    <div className="mt-5 flex justify-between gap-3 border-t border-[var(--border)] pt-4 text-sm">
      {filtros.pagina > 1 ? (
        <Link
          href={`${base}${queryDaPagina(filtros, filtros.pagina - 1)}`}
          className="font-bold text-[var(--primary)] underline underline-offset-2"
        >
          ← Mais recentes
        </Link>
      ) : (
        <span />
      )}
      {filtros.pagina < ultimaPagina && (
        <Link
          href={`${base}${queryDaPagina(filtros, filtros.pagina + 1)}`}
          className="font-bold text-[var(--primary)] underline underline-offset-2"
        >
          Mais antigos →
        </Link>
      )}
    </div>
  );
}
