import { z } from "zod";

import { TAMANHO_MAXIMO_BYTES } from "./formatos";

/**
 * Regras do envio de documento em três passos (etapa 15).
 *
 * O arquivo não passa mais pelo sistema: a tela pede autorização
 * (`prepararEnvio`), manda os bytes direto ao armazenamento e volta para
 * confirmar (`confirmarEnvio`). O que fica aqui é o que decide se uma
 * confirmação vale — a parte do fluxo que, se errar, deixa entrar um arquivo
 * que ninguém autorizou.
 */

/** Por quanto tempo uma autorização vale, do pedido à confirmação. */
export const VALIDADE_ENVIO_MS = 2 * 60 * 60 * 1000;

/** Quantos arquivos um envio aceita de uma vez. */
export const MAXIMO_ARQUIVOS_POR_ENVIO = 20;

/**
 * O que a tela declara sobre cada arquivo antes de enviar. É declaração, não
 * prova: o tamanho é conferido de novo no armazenamento, na confirmação.
 */
const arquivoDeclarado = z.object({
  nome: z.string().trim().min(1).max(255),
  tamanho: z.number().int().nonnegative(),
  tipo: z.string().max(255),
});

export type ArquivoDeclarado = z.infer<typeof arquivoDeclarado>;

export function lerArquivosDeclarados(
  json: string,
): { ok: true; arquivos: ArquivoDeclarado[] } | { ok: false; erro: string } {
  let bruto: unknown;
  try {
    bruto = JSON.parse(json);
  } catch {
    return { ok: false, erro: "Lista de arquivos inválida." };
  }
  const analise = z.array(arquivoDeclarado).safeParse(bruto);
  if (!analise.success) return { ok: false, erro: "Lista de arquivos inválida." };
  if (analise.data.length === 0) {
    return { ok: false, erro: "Selecione ao menos um arquivo." };
  }
  if (analise.data.length > MAXIMO_ARQUIVOS_POR_ENVIO) {
    return {
      ok: false,
      erro: `Envie no máximo ${MAXIMO_ARQUIVOS_POR_ENVIO} arquivos de uma vez.`,
    };
  }
  return { ok: true, arquivos: analise.data };
}

export type EnvioAutorizado = {
  nomeOriginal: string;
  usuarioId: string;
  obraId: string;
  tamanhoBytes: bigint;
  expiraEm: Date;
};

/**
 * Por que esta confirmação não vale, ou `null` se vale.
 *
 * `gravado` é o que o armazenamento diz que tem naquele caminho — `null` se
 * nada chegou. É a única fonte que conta para o tamanho: o que a tela
 * declarou no primeiro passo só serviu para pedir a autorização.
 */
export function recusaDaConfirmacao(
  envio: EnvioAutorizado,
  quem: { usuarioId: string; obraId: string },
  gravado: { tamanhoBytes: number } | null,
  agora: Date,
): string | null {
  // Mesma mensagem para "não é seu" e "não existe": a confirmação não deve
  // servir para descobrir ids de envio de outra pessoa.
  if (envio.usuarioId !== quem.usuarioId || envio.obraId !== quem.obraId) {
    return "Envio não encontrado. Envie o arquivo de novo.";
  }
  if (envio.expiraEm.getTime() <= agora.getTime()) {
    return `${envio.nomeOriginal}: a autorização de envio venceu. Envie de novo.`;
  }
  if (!gravado) {
    return `${envio.nomeOriginal}: o arquivo não chegou ao armazenamento. Envie de novo.`;
  }
  if (BigInt(gravado.tamanhoBytes) !== envio.tamanhoBytes) {
    return `${envio.nomeOriginal}: o arquivo chegou com tamanho diferente do informado. Envie de novo.`;
  }
  if (gravado.tamanhoBytes > TAMANHO_MAXIMO_BYTES) {
    const mb = Math.round(TAMANHO_MAXIMO_BYTES / 1024 / 1024);
    return `${envio.nomeOriginal}: excede o limite de ${mb}MB.`;
  }
  return null;
}
