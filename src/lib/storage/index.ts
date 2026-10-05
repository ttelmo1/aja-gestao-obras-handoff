import "server-only";

import { driver } from "./driver";
import type {
  ArquivoSalvo,
  DestinoEnvio,
  InfoArquivo,
  OpcoesDownload,
} from "./tipos";

/**
 * Fachada do armazenamento de documentos.
 *
 * O driver é escolhido por `STORAGE_DRIVER` (ver `driver.ts`): `s3` em
 * produção, `disco` no desenvolvimento, `db` na demonstração antiga. A API é a
 * mesma nos três, então rota e Server Action não sabem qual está ativo.
 *
 * A resolução acontece a cada chamada, e não no topo do módulo, para que o
 * `env()` já esteja validado quando a primeira requisição chegar.
 */
export type { ArquivoSalvo, DestinoEnvio };
export { novoCaminho, TamanhoNaoConfere } from "./comum";

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

export function infoArquivo(caminhoRelativo: string): Promise<InfoArquivo | null> {
  return driver().infoArquivo(caminhoRelativo);
}

/**
 * Para onde o navegador manda os bytes de um envio autorizado.
 *
 * Com bucket, direto para ele (URL assinada). Sem bucket, para a rota
 * `/envios/[id]` do próprio sistema, que grava pelo driver local. A tela faz
 * o mesmo `PUT` nos dois casos — o desenvolvimento local exercita o mesmo
 * código da produção.
 */
export function destinoDoEnvio(
  envioId: string,
  caminhoRelativo: string,
  tamanhoBytes: number,
  tipoConteudo: string,
): Promise<DestinoEnvio> {
  const d = driver();
  if (d.urlDeEnvio) return d.urlDeEnvio(caminhoRelativo, tamanhoBytes, tipoConteudo);
  return Promise.resolve({
    url: `/envios/${envioId}`,
    cabecalhos: { "Content-Type": tipoConteudo },
  });
}

/** `null` quando o driver não recebe envio pelo servidor (o `s3`). */
export function gravarFluxo(
  caminhoRelativo: string,
  corpo: ReadableStream<Uint8Array>,
  tamanhoEsperado: number,
): Promise<{ tamanhoBytes: number; hashSha256: string }> | null {
  return driver().gravarFluxo?.(caminhoRelativo, corpo, tamanhoEsperado) ?? null;
}

/** `null` quando o driver não tem link direto — aí a rota serve os bytes. */
export function linkDeDownload(
  caminhoRelativo: string,
  opcoes: OpcoesDownload,
): Promise<string> | null {
  return driver().urlDeDownload?.(caminhoRelativo, opcoes) ?? null;
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
