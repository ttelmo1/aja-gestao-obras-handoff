import { createHash, randomUUID } from "node:crypto";

import { caminhoDaObra } from "@/modules/documentos/caminho";
import { extensaoDe } from "@/modules/documentos/formatos";

/**
 * Lê o arquivo enviado e decide como ele será identificado no armazenamento.
 *
 * Vive fora dos drivers porque a regra é a mesma nos dois, e é uma regra de
 * segurança: **o nome no armazenamento é gerado por nós**, nunca o que o
 * navegador mandou. Nome de upload é entrada de usuário — pode conter `../`,
 * barras, caracteres que o sistema de arquivos interpreta. O nome original
 * fica só no banco, para exibir e para nomear o download.
 */
export async function prepararArquivo(arquivo: File, obraId: string) {
  const extensao = extensaoDe(arquivo.name);
  const nomeArmazenado = `${randomUUID()}${extensao ? `.${extensao}` : ""}`;
  const caminhoRelativo = caminhoDaObra(obraId, nomeArmazenado);
  const bytes = Buffer.from(await arquivo.arrayBuffer());

  return {
    bytes,
    salvo: {
      nomeArmazenado,
      caminhoRelativo,
      tamanhoBytes: bytes.byteLength,
      hashSha256: createHash("sha256").update(bytes).digest("hex"),
    },
  };
}
