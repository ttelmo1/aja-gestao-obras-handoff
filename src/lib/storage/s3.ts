import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "../env";
import { prepararArquivo } from "./comum";
import type {
  ArquivoSalvo,
  DestinoEnvio,
  Driver,
  InfoArquivo,
  OpcoesDownload,
} from "./tipos";

/**
 * Armazenamento em bucket S3-compatível — Cloudflare R2 em produção.
 *
 * Existe por causa do teto de corpo da plataforma serverless (~4,5 MB por
 * requisição, em qualquer plano): documento de 300 MB não passa pela função.
 * Então os bytes não passam: o navegador envia e baixa **direto do bucket**,
 * com URLs assinadas que o sistema só emite depois de conferir sessão e
 * permissão. O bucket é privado; sem URL assinada, nada sai dele.
 *
 * "s3" e não "r2" porque o que o código usa é o protocolo: R2, Magalu Cloud e
 * Backblaze falam o mesmo, e trocar de provedor é trocar `S3_ENDPOINT`.
 */

/** Tempo para o navegador começar o envio. 300 MB numa conexão lenta demoram. */
const VALIDADE_ENVIO_S = 60 * 60;

/**
 * Tempo de vida do link de download. Curto de propósito: o link não confere
 * sessão — quem o tiver baixa o arquivo enquanto ele valer.
 */
const VALIDADE_DOWNLOAD_S = 5 * 60;

let cliente: S3Client | null = null;

function s3(): S3Client {
  if (cliente) return cliente;
  const e = env();
  cliente = new S3Client({
    region: e.S3_REGION,
    endpoint: e.S3_ENDPOINT,
    credentials: {
      accessKeyId: e.S3_ACCESS_KEY_ID!,
      secretAccessKey: e.S3_SECRET_ACCESS_KEY!,
    },
    // As versões recentes do SDK põem um checksum CRC32 em toda requisição,
    // inclusive na URL assinada. O navegador não envia esse checksum, e o
    // bucket recusa o envio. Só quando a operação exigir.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return cliente;
}

function bucket(): string {
  return env().S3_BUCKET!;
}

function naoEncontrado(erro: unknown): boolean {
  return (
    erro instanceof S3ServiceException &&
    (erro.name === "NotFound" ||
      erro.name === "NoSuchKey" ||
      erro.$metadata.httpStatusCode === 404)
  );
}

async function salvarArquivo(arquivo: File, obraId: string): Promise<ArquivoSalvo> {
  const { bytes, salvo } = await prepararArquivo(arquivo, obraId);
  await s3().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: salvo.caminhoRelativo,
      Body: bytes,
      ContentType: arquivo.type || undefined,
    }),
  );
  return salvo;
}

async function abrirArquivo(
  caminhoRelativo: string,
): Promise<ReadableStream<Uint8Array> | null> {
  try {
    const resposta = await s3().send(
      new GetObjectCommand({ Bucket: bucket(), Key: caminhoRelativo }),
    );
    return resposta.Body?.transformToWebStream() ?? null;
  } catch (erro) {
    if (naoEncontrado(erro)) return null;
    throw erro;
  }
}

async function infoArquivo(caminhoRelativo: string): Promise<InfoArquivo | null> {
  try {
    const resposta = await s3().send(
      new HeadObjectCommand({ Bucket: bucket(), Key: caminhoRelativo }),
    );
    return { tamanhoBytes: resposta.ContentLength ?? 0 };
  } catch (erro) {
    if (naoEncontrado(erro)) return null;
    throw erro;
  }
}

async function apagarArquivo(caminhoRelativo: string): Promise<void> {
  // Apagar chave inexistente não é erro no S3 — mesmo contrato do
  // `rm(..., { force: true })` no driver de disco.
  await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: caminhoRelativo }));
}

/**
 * URL para o navegador fazer `PUT` direto no bucket.
 *
 * O tipo e o tamanho entram na assinatura: o bucket recusa um corpo de outro
 * tamanho, então a autorização dada para um arquivo de 1 MB não serve para
 * subir 10 GB. A confirmação confere o tamanho de novo (`infoArquivo`), e é
 * ela que vale caso algum provedor ignore o cabeçalho assinado.
 */
async function urlDeEnvio(
  caminhoRelativo: string,
  tamanhoBytes: number,
  tipoConteudo: string,
): Promise<DestinoEnvio> {
  const url = await getSignedUrl(
    s3(),
    new PutObjectCommand({
      Bucket: bucket(),
      Key: caminhoRelativo,
      ContentType: tipoConteudo,
      ContentLength: tamanhoBytes,
    }),
    {
      expiresIn: VALIDADE_ENVIO_S,
      signableHeaders: new Set(["content-type", "content-length"]),
    },
  );
  // `Content-Length` o navegador põe sozinho (e não deixa o código definir);
  // `Content-Type` precisa ir igual ao assinado.
  return { url, cabecalhos: { "Content-Type": tipoConteudo } };
}

/**
 * Link de download. Nome, tipo e cache vão como parâmetros da URL e o bucket
 * os devolve como cabeçalhos da resposta — o tipo derivado da extensão, nunca
 * o que o navegador de quem enviou declarou.
 */
async function urlDeDownload(
  caminhoRelativo: string,
  { nomeArquivo, tipoConteudo, inline }: OpcoesDownload,
): Promise<string> {
  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: caminhoRelativo,
      ResponseContentType: tipoConteudo,
      ResponseContentDisposition: `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(nomeArquivo)}`,
      ResponseCacheControl: "private, no-store",
    }),
    { expiresIn: VALIDADE_DOWNLOAD_S },
  );
}

export const s3Driver: Driver = {
  salvarArquivo,
  abrirArquivo,
  infoArquivo,
  apagarArquivo,
  urlDeEnvio,
  urlDeDownload,
};
