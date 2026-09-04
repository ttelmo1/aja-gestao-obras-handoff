import Link from "next/link";

import { classeInput } from "@/components/ui/formulario";
import { ROTULOS_FAROL } from "@/modules/farol/regras";
import {
  FAROIS,
  ROTULOS_STATUS,
  STATUS_OBRA,
  temFiltroAtivo,
  type Filtros,
} from "@/modules/obras/filtros";

/**
 * Barra de filtros do painel.
 *
 * É um `<form method="get">` puro, sem estado de cliente: os filtros viram
 * query string, então a busca é compartilhável por link e sobrevive ao
 * recarregar — e funciona antes de o JavaScript carregar, o que importa em
 * tablet numa rede local lenta.
 */
export function BarraDeFiltros({
  filtros,
  responsaveis,
  contratantes,
}: {
  filtros: Filtros;
  responsaveis: Array<{ id: string; nome: string }>;
  contratantes: Array<{ id: string; nome: string }>;
}) {
  return (
    <form
      method="get"
      className="mb-5 flex flex-wrap gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5"
    >
      <label className="sr-only" htmlFor="busca">
        Buscar
      </label>
      <input
        id="busca"
        name="busca"
        type="search"
        defaultValue={filtros.busca}
        placeholder="Buscar obra, contrato ou protocolo"
        className={`${classeInput} min-w-56 flex-1`}
      />

      <label className="sr-only" htmlFor="status">
        Situação
      </label>
      <select
        id="status"
        name="status"
        defaultValue={filtros.status ?? ""}
        className={`${classeInput} w-auto min-w-44`}
      >
        <option value="">Todas as situações</option>
        {STATUS_OBRA.map((s) => (
          <option key={s} value={s}>
            {ROTULOS_STATUS[s]}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="farol">
        Farol
      </label>
      <select
        id="farol"
        name="farol"
        defaultValue={filtros.farol ?? ""}
        className={`${classeInput} w-auto min-w-40`}
      >
        <option value="">Todos os faróis</option>
        {FAROIS.map((f) => (
          <option key={f} value={f}>
            {ROTULOS_FAROL[f]}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="responsavel">
        Responsável
      </label>
      <select
        id="responsavel"
        name="responsavel"
        defaultValue={filtros.responsavelId ?? ""}
        className={`${classeInput} w-auto min-w-44`}
      >
        <option value="">Todos os responsáveis</option>
        {responsaveis.map((r) => (
          <option key={r.id} value={r.id}>
            {r.nome}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="contratante">
        Contratante
      </label>
      <select
        id="contratante"
        name="contratante"
        defaultValue={filtros.contratanteId ?? ""}
        className={`${classeInput} w-auto min-w-44`}
      >
        <option value="">Todos os contratantes</option>
        {contratantes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="rounded-lg bg-[var(--primary)] px-3.5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--primary-hover)]"
      >
        Filtrar
      </button>

      {temFiltroAtivo(filtros) && (
        <Link
          href="/obras"
          className="self-center text-sm text-[var(--muted)] underline underline-offset-2"
        >
          Limpar
        </Link>
      )}
    </form>
  );
}
