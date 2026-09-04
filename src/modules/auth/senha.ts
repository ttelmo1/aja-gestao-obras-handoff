import bcrypt from "bcryptjs";
import { z } from "zod";

/**
 * Política de senha e hashing.
 *
 * Deliberadamente modesta: os usuários são servidores administrativos, não
 * técnicos, e regra de composição agressiva ("um caractere especial, uma
 * maiúscula, troque a cada 30 dias") empurra para senha anotada em papel na
 * mesa — o que, num sistema de rede local com acesso físico compartilhado,
 * piora a segurança em vez de melhorar.
 */

/** bcrypt ignora o que passar de 72 bytes; recusar é melhor que truncar em silêncio. */
const MAXIMO_BYTES = 72;

export const MINIMO_CARACTERES = 8;

export const senhaSchema = z
  .string()
  .min(MINIMO_CARACTERES, `A senha precisa de pelo menos ${MINIMO_CARACTERES} caracteres.`)
  .refine((s) => /[a-zA-Z]/.test(s), "A senha precisa de pelo menos uma letra.")
  .refine((s) => /[0-9]/.test(s), "A senha precisa de pelo menos um número.")
  .refine(
    (s) => Buffer.byteLength(s, "utf8") <= MAXIMO_BYTES,
    "A senha é longa demais (máximo de 72 bytes).",
  );

/**
 * Custo 12: ~250ms por hash em hardware de escritório. Alto o bastante para
 * inviabilizar força bruta sobre um dump do banco, baixo o bastante para não
 * pesar num login. Precisa bater com o custo usado em `prisma/seed.ts`.
 */
export const CUSTO_BCRYPT = 12;

export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, CUSTO_BCRYPT);
}

export async function conferirSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

/**
 * Hash descartável, usado para gastar o mesmo tempo de um `conferirSenha`
 * quando o e-mail não existe. Sem isso, "usuário inexistente" responde na
 * hora e "senha errada" demora 250ms — a diferença revela quais e-mails têm
 * conta no sistema.
 */
export const HASH_FALSO =
  "$2b$12$c.R6Bnry0qA03rJ33g1IyOdQSbyZkpcLyGoL0TcrBpJk1pQ8v96B.";
