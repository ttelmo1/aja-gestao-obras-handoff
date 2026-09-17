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
      operador: { select: { id: true, nome: true } },
      criadoPor: { select: { nome: true } },
      medicoes: {
        orderBy: { competencia: "asc" },
        select: {
          valorMedido: true,
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
      // O percurso da medição pelos setores: o mockup mostra "Setor atual" e
      // "Tempo" em cada linha da tabela de medições.
      movimentos: {
        orderBy: { dataEntrada: "asc" },
        include: {
          setorDestino: { select: { id: true, nome: true, sigla: true } },
          setorOrigem: { select: { nome: true } },
          registradoPor: { select: { nome: true } },
          medicao: { select: { id: true, numero: true } },
        },
      },
      // Contagem só do que está vivo: documento excluído não aparece na tela,
      // então não pode aparecer no contador dela.
      _count: { select: { documentos: { where: { excluidoEm: null } } } },
    },
  });
});

export type MedicaoCarregada = Awaited<
  ReturnType<typeof carregarMedicoes>
>[number];

/**
 * Todos os documentos vivos da obra, com o que a central precisa mostrar.
 *
 * Traz os quatro vínculos possíveis porque é deles que sai a origem — a
 * rastreabilidade que o requisito 1.6 pede.
 */
export const carregarDocumentos = cache(async (obraId: string) => {
  return prisma.documento.findMany({
    where: { obraId, excluidoEm: null },
    orderBy: { criadoEm: "desc" },
    include: {
      enviadoPor: { select: { nome: true } },
      medicao: { select: { id: true, numero: true } },
      etapaObra: { select: { id: true, tipo: true } },
      movimento: {
        // `medicaoId` do movimento: documento enviado na tramitação de uma
        // medição pesa sobre ela na hora de apagá-la.
        select: {
          id: true,
          medicaoId: true,
          setorDestino: { select: { nome: true } },
        },
      },
      rerratificacao: { select: { id: true, numero: true } },
    },
  });
});

export type DocumentoCarregado = Awaited<
  ReturnType<typeof carregarDocumentos>
>[number];

/** Rerratificações da obra, com a contagem de anexos vivos. */
export const carregarRerratificacoes = cache(async (obraId: string) => {
  return prisma.rerratificacao.findMany({
    where: { obraId },
    orderBy: { numero: "desc" },
    include: {
      _count: { select: { documentos: { where: { excluidoEm: null } } } },
    },
  });
});

export type RerratificacaoCarregada = Awaited<
  ReturnType<typeof carregarRerratificacoes>
>[number];
