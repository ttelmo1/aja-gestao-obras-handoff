/**
 * Quando uma medição pode ser apagada.
 *
 * A única trava é documento ativo. Até 15/09/2026 só medição em rascunho
 * saía; a regra caiu a pedido do cliente no período de teste, para que as
 * medições de exemplo pudessem ser limpas. O documento continua travando
 * porque é o único registro com arquivo por trás: apagar a medição levaria o
 * arquivo junto, em cascata, sem passar pela exclusão lógica da aba
 * Documentos. Ver ponto #8 de docs/pontos-para-reuniao.md.
 */

/** Os dois caminhos pelos quais um documento se liga a uma medição. */
export type VinculoComMedicao = {
  medicaoId: string | null;
  movimento: { medicaoId: string | null } | null;
};

/**
 * Filtro dos documentos ativos de uma medição. Inclui o que entrou pela
 * tramitação: documento preso a um movimento da medição não tem `medicaoId`,
 * mas sai em cascata junto com o movimento quando a medição é apagada.
 */
export function ondeDocumentosAtivosDaMedicao(medicaoId: string) {
  return {
    excluidoEm: null,
    OR: [{ medicaoId }, { movimento: { medicaoId } }],
  };
}

/** Documentos ativos por medição, a partir da lista já carregada da obra. */
export function contarDocumentosPorMedicao(
  documentos: VinculoComMedicao[],
): Map<string, number> {
  const contagem = new Map<string, number>();
  for (const d of documentos) {
    const medicaoId = d.medicaoId ?? d.movimento?.medicaoId ?? null;
    if (medicaoId) contagem.set(medicaoId, (contagem.get(medicaoId) ?? 0) + 1);
  }
  return contagem;
}

/** Motivo para recusar a exclusão, ou `null` quando ela pode seguir. */
export function bloqueioExclusaoMedicao(documentosAtivos: number): string | null {
  if (documentosAtivos === 0) return null;
  return `Esta medição tem ${documentosAtivos} documento(s) ativo(s). Exclua-os na aba Documentos antes de apagá-la.`;
}
