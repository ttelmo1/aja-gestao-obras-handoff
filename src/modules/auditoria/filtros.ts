import { AcaoAuditoria } from "@/generated/prisma/enums";

import { ENTIDADES_AUDITAVEIS } from "./rotulos";

/**
 * Filtros da tela de auditoria.
 *
 * A trilha só cresce — nunca é apagada, por trigger no banco. Sem filtro e
 * sem paginação, a tela viraria inutilizável no primeiro ano de uso; por
 * isso os dois nascem junto com ela.
 */
export type FiltrosAuditoria = {
  busca: string;
  acao: AcaoAuditoria | null;
  entidade: string | null;
  usuarioId: string | null;
  de: Date | null;
  ate: Date | null;
  pagina: number;
};

export const POR_PAGINA = 50;

const ACOES = new Set<string>(Object.values(AcaoAuditoria));
const ENTIDADES = new Set<string>(ENTIDADES_AUDITAVEIS);

function texto(v: string | string[] | undefined): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

/** Data do filtro lida ao meio-dia, como todo campo de data do sistema. */
function data(v: string | string[] | undefined, fimDoDia = false): Date | null {
  const t = texto(v);
  if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const d = new Date(`${t}T${fimDoDia ? "23:59:59" : "00:00:00"}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function lerFiltrosAuditoria(
  params: Record<string, string | string[] | undefined>,
): FiltrosAuditoria {
  const acao = texto(params.acao);
  const entidade = texto(params.entidade);
  const pagina = Number(texto(params.pagina) ?? "1");

  return {
    busca: texto(params.busca) ?? "",
    acao: acao && ACOES.has(acao) ? (acao as AcaoAuditoria) : null,
    entidade: entidade && ENTIDADES.has(entidade) ? entidade : null,
    usuarioId: texto(params.usuario),
    de: data(params.de),
    ate: data(params.ate, true),
    pagina: Number.isInteger(pagina) && pagina > 0 ? pagina : 1,
  };
}

export function temFiltroAuditoria(f: FiltrosAuditoria): boolean {
  return (
    f.busca !== "" ||
    f.acao !== null ||
    f.entidade !== null ||
    f.usuarioId !== null ||
    f.de !== null ||
    f.ate !== null
  );
}

/**
 * Condição da consulta. `obraId` entra por fora porque a aba da obra sempre
 * o fixa, enquanto a tela geral nunca o usa.
 */
export function condicaoDeAuditoria(
  f: FiltrosAuditoria,
  obraId?: string,
): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (obraId) where.obraId = obraId;
  if (f.acao) where.acao = f.acao;
  if (f.entidade) where.entidade = f.entidade;
  if (f.usuarioId) where.usuarioId = f.usuarioId;

  if (f.de || f.ate) {
    where.criadoEm = {
      ...(f.de ? { gte: f.de } : {}),
      ...(f.ate ? { lte: f.ate } : {}),
    };
  }

  if (f.busca) {
    where.OR = [
      { descricao: { contains: f.busca, mode: "insensitive" } },
      { usuarioNome: { contains: f.busca, mode: "insensitive" } },
    ];
  }
  return where;
}

export function pularRegistros(f: FiltrosAuditoria): number {
  return (f.pagina - 1) * POR_PAGINA;
}

/** Monta a query da página seguinte preservando os filtros ativos. */
export function queryDaPagina(
  f: FiltrosAuditoria,
  pagina: number,
): string {
  const p = new URLSearchParams();
  if (f.busca) p.set("busca", f.busca);
  if (f.acao) p.set("acao", f.acao);
  if (f.entidade) p.set("entidade", f.entidade);
  if (f.usuarioId) p.set("usuario", f.usuarioId);
  if (f.de) p.set("de", f.de.toISOString().slice(0, 10));
  if (f.ate) p.set("ate", f.ate.toISOString().slice(0, 10));
  if (pagina > 1) p.set("pagina", String(pagina));
  const s = p.toString();
  return s ? `?${s}` : "";
}
