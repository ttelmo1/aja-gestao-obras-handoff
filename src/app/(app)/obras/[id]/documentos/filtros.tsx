import { Botao, classeInput } from "@/components/ui/formulario";
import type { TipoDocumento } from "@/generated/prisma/enums";
import type { FiltrosDocumento } from "@/modules/documentos/filtros";
import { ROTULOS_TIPO_DOCUMENTO } from "@/modules/documentos/rotulos";

/**
 * Filtros da central. `<form method="get">` puro: os filtros viram query na
 * URL, então o estado é compartilhável e o botão voltar funciona — mesma
 * escolha do painel de obras.
 */
export function FiltrosDaCentral({
  base,
  filtros,
  tipos,
  origens,
}: {
  base: string;
  filtros: FiltrosDocumento;
  tipos: TipoDocumento[];
  origens: Array<{ chave: string; rotulo: string }>;
}) {
  return (
    <form method="get" action={base} className="grid gap-3 sm:grid-cols-4">
      <input
        type="search"
        name="busca"
        defaultValue={filtros.busca}
        placeholder="Buscar por nome ou descrição"
        aria-label="Buscar documento"
        className={`${classeInput} sm:col-span-2`}
      />

      <select
        name="tipo"
        defaultValue={filtros.tipo ?? ""}
        aria-label="Tipo do documento"
        className={classeInput}
      >
        <option value="">Todos os tipos</option>
        {tipos.map((t) => (
          <option key={t} value={t}>
            {ROTULOS_TIPO_DOCUMENTO[t]}
          </option>
        ))}
      </select>

      <select
        name="origem"
        defaultValue={filtros.origem ?? ""}
        aria-label="Origem do documento"
        className={classeInput}
      >
        <option value="">Todas as origens</option>
        {origens.map((o) => (
          <option key={o.chave} value={o.chave}>
            {o.rotulo}
          </option>
        ))}
      </select>

      <div className="flex gap-2 sm:col-span-4">
        <Botao type="submit" variante="secundario">
          Filtrar
        </Botao>
        <a
          href={base}
          className="self-center text-sm text-[var(--muted)] underline underline-offset-2"
        >
          Limpar
        </a>
      </div>
    </form>
  );
}
