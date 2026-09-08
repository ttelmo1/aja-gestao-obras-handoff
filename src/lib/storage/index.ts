import "server-only";

import { driver } from "./driver";
import type { ArquivoSalvo } from "./tipos";

/**
 * Fachada do armazenamento de documentos.
 *
 * O driver é escolhido por `STORAGE_DRIVER` (ver `driver.ts`): `disco` na
 * instalação on-premise, `db` no deploy de demonstração. A API é a mesma nos
 * dois, então rota e Server Action não sabem qual está ativo.
 *
 * A resolução acontece a cada chamada, e não no topo do módulo, para que o
 * `env()` já esteja validado quando a primeira requisição chegar.
 */
export type { ArquivoSalvo };

export function salvarArquivo(
  arquivo: File,
  obraId: string,
): Promise<ArquivoSalvo> {
  return driver().salvarArquivo(arquivo, obraId);
}

export function abrirArquivo(
  caminhoRelativo: string,
): Promise<ReadableStream<Uint8Array> | null> {
  return driver().abrirArquivo(caminhoRelativo);
}

export function arquivoExiste(caminhoRelativo: string): Promise<boolean> {
  return driver().arquivoExiste(caminhoRelativo);
}

export function apagarArquivo(caminhoRelativo: string): Promise<void> {
  return driver().apagarArquivo(caminhoRelativo);
}
