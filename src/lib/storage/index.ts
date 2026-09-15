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

/**
 * Apaga os arquivos de documentos cujas linhas saíram em cascata — obra ou
 * medição excluída. Sem isto, o registro some e os bytes ficam no
 * armazenamento sem nada que aponte para eles.
 *
 * Chamada **depois** do commit: se a transação falhar, os arquivos precisam
 * continuar lá. E nunca lança: a exclusão já foi confirmada no banco, e um
 * arquivo que não saiu vira órfão registrado no log, não erro na tela.
 */
export async function apagarArquivos(caminhos: string[]): Promise<void> {
  const resultados = await Promise.allSettled(caminhos.map(apagarArquivo));
  resultados.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`Arquivo não apagado: ${caminhos[i]}`, r.reason);
    }
  });
}
