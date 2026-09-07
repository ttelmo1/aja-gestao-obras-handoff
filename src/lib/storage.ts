import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Readable } from "node:stream";

import { env } from "./env";
import { caminhoDaObra, resolverDentroDe } from "@/modules/documentos/caminho";
import { extensaoDe } from "@/modules/documentos/formatos";

/**
 * Armazenamento de arquivos no disco do servidor do cliente.
 *
 * Duas decisões de segurança que valem a explicação:
 *
 * 1. **A pasta fica fora de `public/`.** Qualquer coisa em `public/` é
 *    servida pelo Next sem passar por autenticação — bastaria adivinhar o
 *    nome do arquivo para baixar o contrato de qualquer obra. Todo download
 *    passa pela rota que confere permissão.
 * 2. **O nome do arquivo no disco é gerado por nós**, nunca o que o navegador
 *    mandou. Nome de upload é entrada de usuário: pode conter `../`, barras,
 *    caracteres que o sistema de arquivos interpreta. O nome original fica
 *    só no banco, para exibir e para nomear o download.
 */
export type ArquivoSalvo = {
  nomeArmazenado: string;
  caminhoRelativo: string;
  tamanhoBytes: number;
  hashSha256: string;
};

/** Raiz absoluta do armazenamento, resolvida uma vez. */
function raiz(): string {
  return resolve(process.cwd(), env().STORAGE_DIR);
}

/** Caminho relativo do banco em absoluto, recusando o que escapar da raiz. */
export function caminhoAbsoluto(caminhoRelativo: string): string {
  return resolverDentroDe(raiz(), caminhoRelativo);
}

export async function salvarArquivo(
  arquivo: File,
  obraId: string,
): Promise<ArquivoSalvo> {
  const extensao = extensaoDe(arquivo.name);
  const nomeArmazenado = `${randomUUID()}${extensao ? `.${extensao}` : ""}`;
  const caminhoRelativo = caminhoDaObra(obraId, nomeArmazenado);
  const destino = caminhoAbsoluto(caminhoRelativo);

  const bytes = Buffer.from(await arquivo.arrayBuffer());

  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, bytes, { flag: "wx" }); // wx: nunca sobrescreve

  return {
    nomeArmazenado,
    caminhoRelativo,
    tamanhoBytes: bytes.byteLength,
    hashSha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

/** Stream para a resposta de download, sem carregar o arquivo na memória. */
export async function abrirArquivo(
  caminhoRelativo: string,
): Promise<ReadableStream<Uint8Array> | null> {
  const caminho = caminhoAbsoluto(caminhoRelativo);
  try {
    const info = await stat(caminho);
    if (!info.isFile()) return null;
  } catch {
    return null;
  }
  return Readable.toWeb(
    createReadStream(caminho),
  ) as ReadableStream<Uint8Array>;
}

export async function arquivoExiste(caminhoRelativo: string): Promise<boolean> {
  try {
    return (await stat(caminhoAbsoluto(caminhoRelativo))).isFile();
  } catch {
    return false;
  }
}

/**
 * Remove o arquivo do disco.
 *
 * Usada só quando a gravação no banco falha depois da escrita — o "excluir"
 * do usuário é lógico (`excluidoEm`), e o arquivo permanece: o registro
 * continua na trilha de auditoria, e auditoria que aponta para arquivo
 * inexistente não serve para nada.
 */
export async function apagarArquivo(caminhoRelativo: string): Promise<void> {
  await rm(caminhoAbsoluto(caminhoRelativo), { force: true });
}
