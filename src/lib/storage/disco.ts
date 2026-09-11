import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Readable } from "node:stream";

import { env } from "../env";
import { resolverDentroDe } from "@/modules/documentos/caminho";
import { prepararArquivo } from "./comum";
import type { ArquivoSalvo, Driver } from "./tipos";

/**
 * Armazenamento no disco do servidor do cliente — o driver da instalação
 * on-premise, e o padrão.
 *
 * A pasta fica **fora de `public/`**: qualquer coisa em `public/` é servida
 * pelo Next sem passar por autenticação, e bastaria adivinhar o nome do
 * arquivo para baixar o contrato de qualquer obra. Todo download passa pela
 * rota que confere permissão.
 */

/**
 * Raiz absoluta do armazenamento, resolvida a cada chamada a partir do env.
 *
 * `turbopackIgnore` porque o caminho só é conhecido em runtime, e sem a marca
 * o Turbopack conclui que o projeto inteiro pode ser lido daqui e inclui todo
 * o código-fonte (e a `public/`) no build — foi o que obrigou o empacotador a
 * limpar `docs/`, `tests/` e a própria `storage/` do pacote. A pasta é
 * escolhida pelo `.env` da instalação de propósito: no servidor do cliente ela
 * fica no disco grande, fora da pasta da aplicação.
 */
function raiz(): string {
  return resolve(/*turbopackIgnore: true*/ process.cwd(), env().STORAGE_DIR);
}

/** Caminho relativo do banco em absoluto, recusando o que escapar da raiz. */
export function caminhoAbsoluto(caminhoRelativo: string): string {
  return resolverDentroDe(raiz(), caminhoRelativo);
}

async function salvarArquivo(
  arquivo: File,
  obraId: string,
): Promise<ArquivoSalvo> {
  const { bytes, salvo } = await prepararArquivo(arquivo, obraId);
  const destino = caminhoAbsoluto(salvo.caminhoRelativo);

  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, bytes, { flag: "wx" }); // wx: nunca sobrescreve

  return salvo;
}

async function abrirArquivo(
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

async function arquivoExiste(caminhoRelativo: string): Promise<boolean> {
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
async function apagarArquivo(caminhoRelativo: string): Promise<void> {
  await rm(caminhoAbsoluto(caminhoRelativo), { force: true });
}

export const disco: Driver = {
  salvarArquivo,
  abrirArquivo,
  arquivoExiste,
  apagarArquivo,
};
