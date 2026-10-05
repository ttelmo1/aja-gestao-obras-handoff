import { prisma } from "../prisma";
import { consumirCorpo, prepararArquivo } from "./comum";
import type { ArquivoSalvo, Driver, InfoArquivo } from "./tipos";

/**
 * Armazenamento dos bytes no próprio Postgres (`ArquivoBlob`).
 *
 * Serve ao deploy de demonstração em plataforma serverless, onde o disco é
 * efêmero: o arquivo enviado numa requisição não existe mais na seguinte, e
 * instâncias diferentes não enxergam o mesmo disco. Com os bytes no banco, o
 * cliente sobe um documento hoje e baixa amanhã de outra máquina.
 *
 * Não é o driver de produção: um `bytea` por documento infla o dump do banco
 * e passa o arquivo inteiro pela conexão, e o teto de corpo da plataforma
 * (~4,5 MB) continua valendo para o envio. Fica até os arquivos da
 * homologação serem migrados para o bucket (`STORAGE_DRIVER=s3`).
 */

async function salvarArquivo(
  arquivo: File,
  obraId: string,
): Promise<ArquivoSalvo> {
  const { bytes, salvo } = await prepararArquivo(arquivo, obraId);

  // `create`, não `upsert`: o caminho carrega um uuid recém-sorteado, então
  // colisão aqui é sinal de erro, não de reenvio — equivale ao `wx` do disco.
  await prisma.arquivoBlob.create({
    data: { caminhoRelativo: salvo.caminhoRelativo, conteudo: bytes },
  });

  return salvo;
}

async function abrirArquivo(
  caminhoRelativo: string,
): Promise<ReadableStream<Uint8Array> | null> {
  const registro = await prisma.arquivoBlob.findUnique({
    where: { caminhoRelativo },
    select: { conteudo: true },
  });
  if (!registro) return null;

  // Sem streaming de verdade: o `bytea` já veio inteiro na resposta do banco.
  // A rota de download continua recebendo um `ReadableStream` e não precisa
  // saber disso.
  const conteudo = registro.conteudo;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(conteudo));
      controller.close();
    },
  });
}

async function infoArquivo(caminhoRelativo: string): Promise<InfoArquivo | null> {
  // `octet_length` no banco: buscar a coluna para medir traria o arquivo
  // inteiro pela conexão só para saber o tamanho.
  const linhas = await prisma.$queryRaw<{ tamanho: number }[]>`
    SELECT octet_length("conteudo")::int AS tamanho
    FROM "ArquivoBlob" WHERE "caminhoRelativo" = ${caminhoRelativo}`;
  return linhas[0] ? { tamanhoBytes: linhas[0].tamanho } : null;
}

/** Junta o envio recebido pela rota `/envios/[id]` e grava numa linha só. */
async function gravarFluxo(
  caminhoRelativo: string,
  corpo: ReadableStream<Uint8Array>,
  tamanhoEsperado: number,
) {
  const pedacos: Uint8Array[] = [];
  const gravado = await consumirCorpo(corpo, tamanhoEsperado, async (p) => {
    pedacos.push(p);
  });
  await prisma.arquivoBlob.create({
    data: { caminhoRelativo, conteudo: Buffer.concat(pedacos) },
  });
  return gravado;
}

async function apagarArquivo(caminhoRelativo: string): Promise<void> {
  // `deleteMany`, não `delete`: apagar o que não existe não é erro aqui —
  // mesmo contrato do `rm(..., { force: true })` no driver de disco. Com
  // `delete` a ausência viraria exceção, que só seria engolida depois de já
  // ter sujado o log com um erro do Prisma.
  await prisma.arquivoBlob.deleteMany({ where: { caminhoRelativo } });
}

export const db: Driver = {
  salvarArquivo,
  abrirArquivo,
  infoArquivo,
  apagarArquivo,
  gravarFluxo,
};
