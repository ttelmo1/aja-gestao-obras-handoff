/**
 * Regras da cópia dos arquivos de `ArquivoBlob` (banco) para o bucket
 * (etapa 15, fase 6) — `scripts/migrar-arquivos-para-bucket.ts`.
 *
 * A cópia roda com o sistema em uso, e mais de uma vez: uma antes da virada,
 * outra no momento dela, para levar o que entrou no meio. Por isso cada
 * arquivo é classificado antes de qualquer gravação, e nada que já esteja no
 * bucket é sobrescrito.
 */

export type SituacaoNoBucket =
  /** Não está no bucket: copiar. */
  | "copiar"
  /** Já está, com o mesmo tamanho: rodada anterior. Pular. */
  | "ja-copiado"
  /**
   * Já está, com outro tamanho. Não deveria acontecer — a chave tem um uuid
   * sorteado. Não sobrescreve: quem decide é uma pessoa, olhando os dois.
   */
  | "conflito";

export function situacaoNoBucket(
  tamanhoNoBanco: number,
  noBucket: { tamanhoBytes: number } | null,
): SituacaoNoBucket {
  if (!noBucket) return "copiar";
  return noBucket.tamanhoBytes === tamanhoNoBanco ? "ja-copiado" : "conflito";
}

/**
 * O bucket devolve, no envio simples, o MD5 do que gravou como ETag (entre
 * aspas). Bater com o MD5 calculado aqui prova que o arquivo chegou inteiro,
 * byte a byte — o tamanho sozinho não pega um bit trocado no caminho.
 */
export function etagConfere(md5Hex: string, etag: string | undefined): boolean {
  if (!etag) return false;
  return etag.replaceAll('"', "").toLowerCase() === md5Hex.toLowerCase();
}

export function formatarBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
