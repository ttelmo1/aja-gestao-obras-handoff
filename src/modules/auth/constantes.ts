/**
 * Constantes de autenticação sem dependência de servidor.
 *
 * Separadas de `lib/sessao.ts` porque o `proxy.ts` precisa do nome do cookie
 * e não pode importar nada que puxe Prisma ou `next/headers`.
 */
export const COOKIE_SESSAO = "aja_sessao";
