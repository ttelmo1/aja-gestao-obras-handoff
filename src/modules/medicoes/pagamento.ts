import type { Decimal } from "decimal.js";

import { StatusMedicao } from "@/generated/prisma/enums";
import { diasEntre } from "@/lib/date-br";
import { dec, somar } from "@/lib/money";

import { pagamentoPendente } from "./filtros";

/**
 * Pagamento da medição — pedido do Junior pela Fernanda em 24/09/2026: *"as
 * medições ter a opção de marcar como pago logo no painel de medição"*, com a
 * data do pagamento ao lado, e *"aí pode retirar o pagamento daqui"* — do
 * formulário da medição.
 *
 * O pagamento passa a ter **um caminho só**: o botão na linha da tabela. O
 * formulário deixa de oferecer a situação *Paga* e de mexer na data. Dois
 * caminhos para o mesmo dado eram o risco: o formulário, salvo numa medição já
 * paga sem o campo de data, apagaria a data que o botão gravou.
 */

/**
 * Situações em que o botão aparece: Protocolada e Aprovada.
 *
 * Rascunho fica de fora porque ainda não tem protocolo — e a partir de
 * Protocolada o protocolo é obrigatório (é por ele que o processo é achado no
 * órgão). Deixar pagar um rascunho seria um atalho em volta dessa trava.
 */
export function podeMarcarComoPaga(status: StatusMedicao): boolean {
  return status === StatusMedicao.PROTOCOLADA || status === StatusMedicao.APROVADA;
}

/**
 * Para onde a medição volta quando o pagamento é desfeito: Aprovada.
 *
 * O sistema não guarda a situação anterior ao pagamento, e pagamento de medição
 * pública só sai depois do aceite do órgão — então, se foi paga, foi aprovada.
 * Quem pagou a partir de Protocolada e quiser o registro fiel ajusta no
 * formulário.
 */
export const SITUACAO_AO_DESFAZER_PAGAMENTO = StatusMedicao.APROVADA;

/** Erro de validação da data digitada no botão, ou `null` se ela serve. */
export function erroNaDataDoPagamento(
  data: Date | null,
  agora: Date = new Date(),
): string | null {
  if (!data) return "Informe a data do pagamento.";
  // Pagamento é registro do que já aconteceu: data no futuro é erro de
  // digitação, e contaria como paga uma medição que ainda não recebeu.
  if (diasEntre(agora, data) > 0) {
    return "A data do pagamento não pode ser depois de hoje.";
  }
  return null;
}

/**
 * Situação que o **formulário** pode gravar, dada a situação atual.
 *
 * Devolve a mensagem de erro, ou `null` se a troca é permitida. `antes` nulo é
 * medição nova.
 */
export function erroNaSituacaoPeloFormulario(
  antes: StatusMedicao | null,
  depois: StatusMedicao,
): string | null {
  const eraPaga = antes === StatusMedicao.PAGA;
  const ficaPaga = depois === StatusMedicao.PAGA;
  if (!eraPaga && ficaPaga) {
    return "Para marcar como paga, use o botão na lista de medições — é lá que fica a data do pagamento.";
  }
  if (eraPaga && !ficaPaga) {
    return "Esta medição está paga. Para mudar a situação, desfaça o pagamento na lista de medições.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Pagamentos pendentes de todas as obras — o quadro do painel e a lista que
// ele abre (24/09/2026: "uma planilha com o nome da obra, o número da medição
// e o valor", "apenas informativa").
// ---------------------------------------------------------------------------

export type ObraComMedicoes = {
  id: string;
  objeto: string;
  numeroContrato: string;
  medicoes: Array<{
    id: string;
    numero: number;
    competencia: Date;
    status: StatusMedicao;
    valorMedido: Decimal | string | number;
  }>;
};

export type LinhaPagamentoPendente = {
  obraId: string;
  objeto: string;
  numeroContrato: string;
  medicaoId: string;
  numero: number;
  competencia: Date;
  status: StatusMedicao;
  valor: Decimal;
};

/**
 * Medições com pagamento pendente, obra a obra, na ordem em que as obras
 * chegam (o painel já as ordena) e, dentro da obra, da medição mais antiga
 * para a mais nova — a mais antiga é a que está esperando há mais tempo.
 *
 * A regra de "pendente" é a mesma do filtro da aba Medições
 * (`pagamentoPendente`): o quadro, a lista e o filtro não podem responder
 * diferente à mesma pergunta.
 */
export function pagamentosPendentes(
  obras: ObraComMedicoes[],
): LinhaPagamentoPendente[] {
  return linhasDasObras(obras, (m) => pagamentoPendente(m.status));
}

/**
 * Medições em rascunho, na mesma ordem — o bloco que fica abaixo da lista de
 * pagamentos pendentes, com total próprio. Pedido do Junior pela Fernanda em
 * 09/10/2026: *"separe as medições em rascunho"*, *"para não somar com o total
 * das que já estão aprovadas"*.
 */
export function medicoesEmRascunho(
  obras: ObraComMedicoes[],
): LinhaPagamentoPendente[] {
  return linhasDasObras(obras, (m) => m.status === StatusMedicao.RASCUNHO);
}

function linhasDasObras(
  obras: ObraComMedicoes[],
  entra: (m: ObraComMedicoes["medicoes"][number]) => boolean,
): LinhaPagamentoPendente[] {
  return obras.flatMap((o) =>
    o.medicoes
      .filter(entra)
      .sort((a, b) => a.numero - b.numero)
      .map((m) => ({
        obraId: o.id,
        objeto: o.objeto,
        numeroContrato: o.numeroContrato,
        medicaoId: m.id,
        numero: m.numero,
        competencia: m.competencia,
        status: m.status,
        valor: dec(m.valorMedido),
      })),
  );
}

export type TotalPendente = { quantidade: number; valor: Decimal };

export function totalPendente(linhas: LinhaPagamentoPendente[]): TotalPendente {
  return {
    quantidade: linhas.length,
    valor: somar(...linhas.map((l) => l.valor)),
  };
}
