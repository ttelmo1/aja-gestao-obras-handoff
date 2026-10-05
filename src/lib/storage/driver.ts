import { env } from "../env";
import { db } from "./db";
import { disco } from "./disco";
import { s3Driver } from "./s3";
import type { Driver } from "./tipos";

/**
 * Escolhe o driver a partir de `STORAGE_DRIVER`.
 *
 * Fica separado de `index.ts` porque aquele arquivo é `server-only`, e o seed
 * roda como script Node comum — importar `server-only` fora do Next quebra na
 * carga do módulo.
 */
export function driver(): Driver {
  switch (env().STORAGE_DRIVER) {
    case "s3":
      return s3Driver;
    case "db":
      return db;
    default:
      return disco;
  }
}
