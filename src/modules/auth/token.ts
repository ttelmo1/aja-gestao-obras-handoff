import { createHmac, randomBytes } from "node:crypto";

/**
 * Tokens opacos para sessão e para redefinição de senha.
 *
 * O token vai inteiro para o cookie (ou para o link de redefinição) e só o
 * HMAC dele é gravado. Duas consequências que motivaram a escolha:
 * quem ler o banco não consegue se passar por ninguém, e revogar é apagar
 * uma linha — coisa que um JWT autocontido não permite.
 */

const BYTES_TOKEN = 32; // 256 bits

export function gerarToken(): string {
  return randomBytes(BYTES_TOKEN).toString("base64url");
}

export function hashToken(token: string, segredo: string): string {
  return createHmac("sha256", segredo).update(token).digest("hex");
}

/** Duração da sessão: uma jornada de trabalho com folga, não uma semana. */
export const DURACAO_SESSAO_MS = 12 * 60 * 60 * 1000;

/**
 * Link de redefinição de senha: 24 horas.
 *
 * Mais longo do que a hora usual porque não há servidor de e-mail na
 * instalação — o link é gerado pelo administrador e entregue à pessoa fora do
 * sistema (pessoalmente, por telefone, por mensagem). Uma hora não sobrevive
 * a quem pede a redefinição no fim do expediente.
 */
export const DURACAO_TOKEN_SENHA_MS = 24 * 60 * 60 * 1000;

export function expiraEm(duracaoMs: number, agora: Date = new Date()): Date {
  return new Date(agora.getTime() + duracaoMs);
}

export function expirou(data: Date, agora: Date = new Date()): boolean {
  return data.getTime() <= agora.getTime();
}
