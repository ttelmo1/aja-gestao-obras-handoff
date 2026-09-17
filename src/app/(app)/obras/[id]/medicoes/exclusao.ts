import { formatarCompetencia } from "@/lib/date-br";
import { formatarBRL } from "@/lib/money";
import { ROTULOS_STATUS_MEDICAO } from "@/modules/medicoes/rotulos";

import type { MedicaoCarregada } from "../dados";
import type { MedicaoParaExcluir } from "./formulario";

/**
 * Monta o que a confirmação de exclusão mostra. Formata no servidor porque
 * `Decimal` e `Date` não atravessam para o componente cliente, e é o mesmo
 * resumo na tabela e no detalhe da medição.
 */
export function medicaoParaExcluir(
  m: MedicaoCarregada,
  documentosPorMedicao: Map<string, number>,
): MedicaoParaExcluir {
  return {
    id: m.id,
    numero: String(m.numero).padStart(2, "0"),
    competencia: formatarCompetencia(m.competencia),
    valor: formatarBRL(m.valorMedido),
    situacao: ROTULOS_STATUS_MEDICAO[m.status],
    protocolo: m.protocolo,
    documentosAtivos: documentosPorMedicao.get(m.id) ?? 0,
  };
}
