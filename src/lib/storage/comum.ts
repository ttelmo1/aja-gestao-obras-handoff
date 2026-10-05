import { createHash, randomUUID } from "node:crypto";

import { caminhoDaObra } from "@/modules/documentos/caminho";
import { extensaoDe } from "@/modules/documentos/formatos";

/**
 * Decide como um arquivo novo será identificado no armazenamento.
 *
 * Vive fora dos drivers porque a regra é a mesma em todos, e é uma regra de
 * segurança: **o nome no armazenamento é gerado por nós**, nunca o que o
 * navegador mandou. Nome de upload é entrada de usuário — pode conter `../`,
 * barras, caracteres que o sistema de arquivos interpreta. O nome original
 * fica só no banco, para exibir e para nomear o download.
 */
export function novoCaminho(obraId: string, nomeOriginal: string) {
  const extensao = extensaoDe(nomeOriginal);
  const nomeArmazenado = `${randomUUID()}${extensao ? `.${extensao}` : ""}`;
  return { nomeArmazenado, caminhoRelativo: caminhoDaObra(obraId, nomeArmazenado) };
}

/** Lê o arquivo inteiro e calcula o que vai para o banco. */
export async function prepararArquivo(arquivo: File, obraId: string) {
  const bytes = Buffer.from(await arquivo.arrayBuffer());

  return {
    bytes,
    salvo: {
      ...novoCaminho(obraId, arquivo.name),
      tamanhoBytes: bytes.byteLength,
      hashSha256: createHash("sha256").update(bytes).digest("hex"),
    },
  };
}

/** O corpo recebido não tem o tamanho que foi autorizado. */
export class TamanhoNaoConfere extends Error {}

/**
 * Percorre o corpo de um envio contando e calculando o hash, e entrega cada
 * pedaço a `escrever`.
 *
 * Interrompe assim que passar de `tamanhoEsperado` — sem isso, quem pediu
 * autorização para 1 MB poderia mandar 10 GB pela mesma URL e só seria
 * barrado no fim, com tudo já gravado.
 */
export async function consumirCorpo(
  corpo: ReadableStream<Uint8Array>,
  tamanhoEsperado: number,
  escrever: (pedaco: Uint8Array) => Promise<void>,
): Promise<{ tamanhoBytes: number; hashSha256: string }> {
  const hash = createHash("sha256");
  let tamanhoBytes = 0;

  const leitor = corpo.getReader();
  try {
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      tamanhoBytes += value.byteLength;
      if (tamanhoBytes > tamanhoEsperado) {
        throw new TamanhoNaoConfere("Arquivo maior que o informado.");
      }
      hash.update(value);
      await escrever(value);
    }
  } finally {
    leitor.releaseLock();
  }

  if (tamanhoBytes !== tamanhoEsperado) {
    throw new TamanhoNaoConfere("Arquivo chegou incompleto.");
  }
  return { tamanhoBytes, hashSha256: hash.digest("hex") };
}
