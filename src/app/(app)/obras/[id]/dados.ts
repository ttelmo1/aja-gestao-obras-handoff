import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";

/**
 * Carrega a obra uma vez por requisição. O layout precisa dela para o
 * cabeçalho e a página precisa dela para o conteúdo; `cache` do React faz as
 * duas chamadas virarem uma consulta só.
 */
export const carregarObra = cache(async (id: string) => {
  return prisma.obra.findUnique({
    where: { id },
    include: {
      contratante: { select: { id: true, nome: true, cnpj: true, esfera: true } },
      responsavel: { select: { id: true, nome: true, cargo: true, registro: true } },
      criadoPor: { select: { nome: true } },
      medicoes: {
        orderBy: { competencia: "asc" },
        select: {
          valorMedido: true,
          percentualExecutado: true,
          competencia: true,
          dataMedicao: true,
        },
      },
      _count: {
        select: {
          medicoes: true,
          documentos: true,
          rerratificacoes: true,
          etapas: true,
        },
      },
    },
  });
});

export type ObraCarregada = NonNullable<Awaited<ReturnType<typeof carregarObra>>>;

/** Datas do banco viram `yyyy-mm-dd` para os campos `<input type="date">`. */
export function paraCampoData(d: Date | null): string | null {
  if (!d) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

/** Competência do banco vira `yyyy-mm` para o campo `<input type="month">`. */
export function paraCampoMes(d: Date | null): string | null {
  const iso = paraCampoData(d);
  return iso ? iso.slice(0, 7) : null;
}

/**
 * Carrega as medições da obra com tudo que a aba mostra. Separado de
 * `carregarObra` porque só esta aba precisa da lista completa — o painel e o
 * resumo se viram com os quatro campos do cálculo.
 */
export const carregarMedicoes = cache(async (obraId: string) => {
  return prisma.medicao.findMany({
    where: { obraId },
    orderBy: [{ numero: "desc" }],
    include: {
      responsavel: { select: { id: true, nome: true } },
      _count: { select: { documentos: true } },
    },
  });
});

export type MedicaoCarregada = Awaited<
  ReturnType<typeof carregarMedicoes>
>[number];
