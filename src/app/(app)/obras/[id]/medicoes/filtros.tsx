import { Botao, classeInput } from "@/components/ui/formulario";
import type { FiltrosMedicao } from "@/modules/medicoes/filtros";
import {
  ROTULOS_STATUS_MEDICAO,
  STATUS_MEDICAO,
} from "@/modules/medicoes/rotulos";

/**
 * Filtros da aba Medições. `<form method="get">` puro, como o painel de obras
 * e a central de documentos: o filtro vira query na URL, então dá para
 * compartilhar o link e o botão voltar funciona.
 */
export function FiltrosDasMedicoes({
  base,
  filtros,
}: {
  base: string;
  filtros: FiltrosMedicao;
}) {
  return (
    <form method="get" action={base} className="grid gap-3 sm:grid-cols-3">
      <select
        name="status"
        defaultValue={filtros.status ?? ""}
        aria-label="Situação da medição"
        className={classeInput}
      >
        <option value="">Todas as situações</option>
        {STATUS_MEDICAO.map((s) => (
          <option key={s} value={s}>
            {ROTULOS_STATUS_MEDICAO[s]}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="pagamento"
          value="pendente"
          defaultChecked={filtros.pendentes}
        />
        Só pagamento pendente
      </label>

      <div className="flex gap-2">
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
