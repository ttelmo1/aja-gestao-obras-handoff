import { env } from "../env";
import { db } from "./db";
import { disco } from "./disco";
import type { Driver } from "./tipos";

/**
 * Escolhe o driver a partir de `STORAGE_DRIVER`.
 *
 * Fica separado de `index.ts` porque aquele arquivo é `server-only`, e o seed
 * roda como script Node comum — importar `server-only` fora do Next quebra na
 * carga do módulo.
 */
export function driver(): Driver {
  return env().STORAGE_DRIVER === "db" ? db : disco;
}
