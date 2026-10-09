import { StatusMedicao } from "@/generated/prisma/enums";

import { emAndamento } from "./rotulos";

/**
 * Filtros da aba Medições.
 *
 * Existem por causa do pedido do Junior em 17/09/2026, pela Fernanda: *"que
 * essa opção fique na aba de medições, pra poder marcar como pendente,
 * aparecer quando for filtrar"*.
 *
 * O que ele chama de "marcar como pendente" já é a situação da medição: uma
 * medição que não foi paga está, por definição, com pagamento pendente. Por
 * isso a pendência **não é um campo novo** — é leitura do `status`, o mesmo
 * que a tela já mostra no badge. Um marcador manual em paralelo poderia
 * discordar dele (medição "Paga" marcada como pendente), e o sistema passaria
 * a dar duas respostas para a mesma pergunta.
 *
 * Fica de fora, por falta de resposta do cliente, a diferença entre *pendente*
 * e *atrasado*: não sabemos de onde sai o prazo de pagamento (protocolo,
 * aprovação, prazo fixo de contrato). Ver ponto #24.
 */
export type FiltrosMedicao = {
  status: StatusMedicao | null;
  /** `true` quando o filtro pede só o que ainda não foi pago. */
  pendentes: boolean;
};

export const FILTROS_MEDICAO_VAZIOS: FiltrosMedicao = {
  status: null,
  pendentes: false,
};

type Entrada = Record<string, string | string[] | undefined>;

function texto(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

/** Valor inválido vindo de URL editada à mão vira "sem filtro", nunca erro. */
export function lerFiltrosMedicao(params: Entrada): FiltrosMedicao {
  const status = texto(params.status);
  const validos: readonly string[] = Object.values(StatusMedicao);
  return {
    status: validos.includes(status) ? (status as StatusMedicao) : null,
    pendentes: texto(params.pagamento) === "pendente",
  };
}

export function temFiltroMedicao(f: FiltrosMedicao): boolean {
  return f.status !== null || f.pendentes;
}

/**
 * Pagamento pendente: a medição foi protocolada no órgão e ainda não foi paga.
 *
 * - `REJEITADA` não conta — ela saiu do ciclo, ninguém espera pagamento dela.
 * - `RASCUNHO` também não, desde o pedido do Junior pela Fernanda em
 *   09/10/2026: separar as medições em rascunho *"para não somar com o total
 *   das que já estão aprovadas"*. Rascunho ainda não foi entregue ao órgão —
 *   nem pode ser marcado como pago (`podeMarcarComoPaga`). Na lista de
 *   pagamentos pendentes ele aparece num bloco à parte, fora da soma.
 */
export function pagamentoPendente(status: StatusMedicao): boolean {
  return emAndamento(status) && status !== StatusMedicao.RASCUNHO;
}

export function filtrarMedicoes<M extends { status: StatusMedicao }>(
  medicoes: M[],
  f: FiltrosMedicao,
): M[] {
  return medicoes.filter((m) => {
    if (f.status && m.status !== f.status) return false;
    if (f.pendentes && !pagamentoPendente(m.status)) return false;
    return true;
  });
}
