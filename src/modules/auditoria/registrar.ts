import type { Prisma } from "@/generated/prisma/client";
import { AcaoAuditoria } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/**
 * Trilha de auditoria (requisitos.md 1.8 — registro imutável).
 *
 * Construída já na fundação, de propósito: instrumentar depois obrigaria a
 * revisitar todos os módulos. Cada módulo novo chama `registrar` na mesma
 * transação da escrita que originou o evento.
 *
 * A tabela é append-only. Não existe, e não deve existir, função de update
 * ou delete neste arquivo.
 */
export type Ator = {
  id: string | null;
  nome: string;
  ip?: string | null;
};

export type EventoAuditoria = {
  ator: Ator;
  acao: AcaoAuditoria;
  entidade: string;
  entidadeId?: string | null;
  obraId?: string | null;
  descricao: string;
  dadosAntes?: unknown;
  dadosDepois?: unknown;
};

/**
 * Recebe o client ou uma transação. Passar `tx` faz o log nascer atômico com
 * a operação auditada: se a escrita falhar, o registro não fica órfão.
 */
export async function registrar(
  evento: EventoAuditoria,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  await tx.auditoria.create({
    data: {
      usuarioId: evento.ator.id,
      usuarioNome: evento.ator.nome,
      acao: evento.acao,
      entidade: evento.entidade,
      entidadeId: evento.entidadeId ?? null,
      obraId: evento.obraId ?? null,
      descricao: evento.descricao,
      dadosAntes: sanitizar(evento.dadosAntes),
      dadosDepois: sanitizar(evento.dadosDepois),
      ip: evento.ator.ip ?? null,
    },
  });
}

/** Campos que nunca podem entrar no log. */
const CAMPOS_SENSIVEIS = new Set(["senha", "senhaHash", "tokenHash", "token"]);

/**
 * Prepara o payload para a coluna Json: remove segredos e converte Decimal,
 * Date e BigInt, que não sobrevivem a JSON.stringify sem tratamento.
 */
function sanitizar(valor: unknown): Prisma.InputJsonValue | undefined {
  if (valor === undefined || valor === null) return undefined;
  return JSON.parse(
    JSON.stringify(valor, (chave, v) => {
      if (CAMPOS_SENSIVEIS.has(chave)) return "[omitido]";
      if (typeof v === "bigint") return v.toString();
      if (v instanceof Date) return v.toISOString();
      // Decimal do Prisma e do decimal.js expõem toFixed.
      if (v && typeof v === "object" && "toFixed" in v && "s" in v && "e" in v) {
        return String(v);
      }
      return v;
    }),
  );
}

export { diff } from "./diff";

export { AcaoAuditoria };
