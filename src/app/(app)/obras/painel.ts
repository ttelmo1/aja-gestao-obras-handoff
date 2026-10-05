import "server-only";

import { prisma } from "@/lib/prisma";
import {
  condicaoDeBusca,
  filtrarPorFarol,
  type Filtros,
} from "@/modules/obras/filtros";
import { resumoDaObra } from "@/modules/obras/resumo";

/**
 * Obras do painel, já com resumo, ordenadas e filtradas.
 *
 * Saiu da página do painel em 24/09/2026, quando o quadro "Pagamento
 * pendente" ganhou uma lista própria: o quadro soma as obras do filtro, e a
 * lista que ele abre precisa partir exatamente das mesmas obras — senão o
 * total do quadro e a soma da lista divergem.
 */
export async function carregarObrasDoPainel(filtros: Filtros, agora: Date) {
  const registros = await prisma.obra.findMany({
    where: condicaoDeBusca(filtros),
    // Ordem só de desempate: a ordenação que vale é por término vigente e
    // acontece em memória, depois do resumo — o prazo aditivado é um
    // contador de dias, não dá para somá-lo na data pelo `orderBy`. São
    // quinze a vinte contratos, cabe de sobra.
    orderBy: [{ criadoEm: "desc" }],
    select: {
      id: true,
      codigo: true,
      objeto: true,
      numeroContrato: true,
      status: true,
      valorContratado: true,
      valorAditivado: true,
      dataOrdemInicio: true,
      dataPrevistaTermino: true,
      prazoAditivadoDias: true,
      periodicidadeMedicao: true,
      intervaloMedicaoDias: true,
      observacoes: true,
      contratante: { select: { nome: true } },
      operadorId: true,
      operador: { select: { nome: true } },
      operadorAssumidoEm: true,
      operadorLiberadoEm: true,
      operadorObservacao: true,
      suspensoes: { select: { dataInicio: true, dataFim: true } },
      medicoes: {
        select: {
          id: true,
          numero: true,
          status: true,
          valorMedido: true,
          competencia: true,
          dataMedicao: true,
        },
      },
    },
  });

  const obras = registros
    .map((o) => ({
      ...o,
      resumo: resumoDaObra(o, o.medicoes, agora),
    }))
    // Quem vence primeiro aparece primeiro, contando a prorrogação já
    // aprovada. Obra sem término vai para o fim: não tem vencimento a cobrar.
    .sort((a, b) => {
      const ta = a.resumo.terminoVigente?.getTime() ?? Infinity;
      const tb = b.resumo.terminoVigente?.getTime() ?? Infinity;
      return ta - tb;
    });

  return filtrarPorFarol(
    obras.map((o) => ({ ...o, farol: o.resumo.farol })),
    filtros.farol,
  );
}

export type ObraDoPainel = Awaited<ReturnType<typeof carregarObrasDoPainel>>[number];
