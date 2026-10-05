/**
 * Copia os arquivos de `ArquivoBlob` (bytes no Postgres) para o bucket S3/R2,
 * com a mesma chave (`caminhoRelativo`) — `Documento` não muda (etapa 15,
 * fase 6).
 *
 *   npm run storage:migrar                # simula: só lista o que faria
 *   npm run storage:migrar -- --executar  # copia
 *
 * **Só lê o banco e só acrescenta no bucket.** Não apaga nem altera linha
 * nenhuma, nem sobrescreve objeto que já exista. O ambiente continua lendo do
 * banco até o `STORAGE_DRIVER` virar `s3` — então dá para rodar com o sistema
 * em uso, e rodar de novo na virada: o que já foi copiado é pulado.
 *
 * Usa `DATABASE_URL` (origem) e `S3_*` (destino) do ambiente, qualquer que seja
 * o `STORAGE_DRIVER`. Apagar as linhas de `ArquivoBlob` é outro passo, depois
 * de a produção rodar sobre o bucket — ver `docs/plano-armazenamento-r2.md`.
 */
import "dotenv/config";
import { createHash } from "node:crypto";

import { prisma } from "../src/lib/prisma";
import { gravarNoBucket, s3Driver } from "../src/lib/storage/s3";
import { tipoDeConteudo } from "../src/modules/documentos/formatos";
import {
  etagConfere,
  formatarBytes,
  situacaoNoBucket,
} from "../src/modules/documentos/migracao";

const executar = process.argv.includes("--executar");

function exigirDestino(): void {
  const faltando = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"]
    .filter((v) => !process.env[v]);
  if (faltando.length) {
    console.error(`Faltam variáveis do bucket de destino: ${faltando.join(", ")}`);
    process.exit(2);
  }
}

async function main() {
  exigirDestino();
  console.log(
    `${executar ? "EXECUTANDO" : "SIMULAÇÃO (nada será gravado; use --executar)"}\n` +
      `Destino: bucket "${process.env.S3_BUCKET}" em ${process.env.S3_ENDPOINT}\n`,
  );

  // Só o tamanho, sem os bytes: a lista inteira viria pela conexão de uma vez.
  const blobs = await prisma.$queryRaw<{ caminhoRelativo: string; tamanho: number }[]>`
    SELECT "caminhoRelativo", octet_length("conteudo")::int AS tamanho
    FROM "ArquivoBlob" ORDER BY "criadoEm"`;

  // Documentos excluídos entram: a exclusão é lógica, e o arquivo continua
  // valendo para a auditoria.
  const documentos = await prisma.documento.findMany({
    select: { caminhoRelativo: true, extensao: true, tamanhoBytes: true, nomeOriginal: true },
  });
  const porCaminho = new Map(documentos.map((d) => [d.caminhoRelativo, d]));
  const comBlob = new Set(blobs.map((b) => b.caminhoRelativo));

  const conta = { copiados: 0, jaCopiados: 0, conflitos: 0, falhas: 0, orfaos: 0, bytes: 0 };

  for (const [i, blob] of blobs.entries()) {
    const prefixo = `[${i + 1}/${blobs.length}]`;
    const doc = porCaminho.get(blob.caminhoRelativo);
    if (!doc) {
      // Bytes sem documento: sobra de exclusão em cascata que não limpou.
      // Não há quem os abra; ficam fora da cópia.
      conta.orfaos += 1;
      console.log(`${prefixo} ÓRFÃO, sem documento — não copiado: ${blob.caminhoRelativo}`);
      continue;
    }
    const rotulo = `${doc.nomeOriginal} (${formatarBytes(blob.tamanho)})`;

    const situacao = situacaoNoBucket(blob.tamanho, await s3Driver.infoArquivo(blob.caminhoRelativo));
    if (situacao === "ja-copiado") {
      conta.jaCopiados += 1;
      console.log(`${prefixo} já no bucket: ${rotulo}`);
      continue;
    }
    if (situacao === "conflito") {
      conta.conflitos += 1;
      console.log(`${prefixo} CONFLITO — já existe no bucket com outro tamanho, não sobrescrito: ${blob.caminhoRelativo}`);
      continue;
    }
    if (BigInt(blob.tamanho) !== doc.tamanhoBytes) {
      console.log(`${prefixo} aviso: o documento registra ${doc.tamanhoBytes} bytes e o banco guarda ${blob.tamanho}; copiando o que está guardado.`);
    }
    if (!executar) {
      conta.copiados += 1;
      conta.bytes += blob.tamanho;
      console.log(`${prefixo} copiaria: ${rotulo}`);
      continue;
    }

    try {
      // Um arquivo por vez na memória e na conexão: o banco está em uso.
      const { conteudo } = await prisma.arquivoBlob.findUniqueOrThrow({
        where: { caminhoRelativo: blob.caminhoRelativo },
        select: { conteudo: true },
      });
      const md5 = createHash("md5").update(conteudo).digest("hex");
      const etag = await gravarNoBucket(blob.caminhoRelativo, conteudo, tipoDeConteudo(doc.extensao));
      const gravado = await s3Driver.infoArquivo(blob.caminhoRelativo);
      if (!etagConfere(md5, etag) || gravado?.tamanhoBytes !== blob.tamanho) {
        throw new Error(`conferência falhou (ETag ${etag}, MD5 ${md5}, tamanho ${gravado?.tamanhoBytes})`);
      }
      conta.copiados += 1;
      conta.bytes += blob.tamanho;
      console.log(`${prefixo} copiado e conferido: ${rotulo}`);
    } catch (erro) {
      conta.falhas += 1;
      console.log(`${prefixo} FALHOU: ${rotulo} — ${(erro as Error).message}`);
    }
  }

  // O caminho inverso: documento que nenhum driver tem. Já não abre hoje; a
  // migração não piora nem resolve, mas a lista ajuda a explicar o 410.
  const semArquivo = documentos.filter((d) => !comBlob.has(d.caminhoRelativo));
  for (const d of semArquivo) {
    const noBucket = await s3Driver.infoArquivo(d.caminhoRelativo);
    if (!noBucket) console.log(`documento SEM ARQUIVO no banco nem no bucket: ${d.nomeOriginal} (${d.caminhoRelativo})`);
  }

  console.log(
    `\nResumo${executar ? "" : " da simulação"}:\n` +
      `  ${executar ? "copiados" : "a copiar"}: ${conta.copiados} (${formatarBytes(conta.bytes)})\n` +
      `  já no bucket: ${conta.jaCopiados}\n` +
      `  conflitos: ${conta.conflitos}\n` +
      `  falhas: ${conta.falhas}\n` +
      `  órfãos (sem documento): ${conta.orfaos}`,
  );
  await prisma.$disconnect();
  if (conta.conflitos || conta.falhas) process.exit(1);
}

main().catch(async (erro) => {
  console.error(erro);
  await prisma.$disconnect();
  process.exit(1);
});
