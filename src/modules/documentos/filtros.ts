import { TipoDocumento } from "@/generated/prisma/enums";

import { origemDoDocumento, type VinculosDoDocumento } from "./origem";

/**
 * Busca e filtros da central de documentos (requisitos.md 1.6: "busca e
 * filtros por tipo de documento e por origem").
 *
 * A busca vai ao banco; o filtro de origem é aplicado em memória, porque
 * "origem" não é coluna — é o vínculo mais específico entre quatro colunas
 * possíveis, e traduzi-lo em `where` daria uma condição ilegível para
 * ganhar nada: são dezenas de documentos por obra, não milhares.
 */
export type FiltrosDocumento = {
  busca: string;
  tipo: TipoDocumento | null;
  origem: string | null;
};

export const FILTROS_VAZIOS: FiltrosDocumento = {
  busca: "",
  tipo: null,
  origem: null,
};

const TIPOS = new Set<string>(Object.values(TipoDocumento));

export function lerFiltrosDocumento(
  params: Record<string, string | string[] | undefined>,
): FiltrosDocumento {
  const texto = (v: string | string[] | undefined) =>
    typeof v === "string" && v.trim() !== "" ? v.trim() : null;

  const tipo = texto(params.tipo);
  return {
    busca: texto(params.busca) ?? "",
    tipo: tipo && TIPOS.has(tipo) ? (tipo as TipoDocumento) : null,
    origem: texto(params.origem),
  };
}

export function temFiltroDocumento(f: FiltrosDocumento): boolean {
  return f.busca !== "" || f.tipo !== null || f.origem !== null;
}

/** Condição de busca por nome do arquivo ou descrição. */
export function condicaoDeBuscaDocumento(f: FiltrosDocumento) {
  const where: Record<string, unknown> = { excluidoEm: null };
  if (f.tipo) where.tipo = f.tipo;
  if (f.busca) {
    where.OR = [
      { nomeOriginal: { contains: f.busca, mode: "insensitive" } },
      { descricao: { contains: f.busca, mode: "insensitive" } },
    ];
  }
  return where;
}

/** Filtro de origem, aplicado depois da consulta. */
export function filtrarPorOrigem<T extends VinculosDoDocumento>(
  documentos: T[],
  origem: string | null,
): T[] {
  if (!origem) return documentos;
  return documentos.filter((d) => origemDoDocumento(d).chave === origem);
}
