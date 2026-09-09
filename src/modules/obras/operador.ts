import type { Farol } from "@/generated/prisma/enums";

/**
 * Operador da obra — atribuição momentânea (requisitos.md 1.2).
 *
 * Desenho fechado com o gestor de engenharia do cliente em 09/09/2026, e a
 * regra que ele resume é esta: **não existe responsável fixo por obra**. São 15
 * a 20 contratos para três pessoas no setor, "quem tiver, dependendo da
 * urgência" trata, às vezes duas na mesma obra. Então o campo não é uma
 * atribuição feita por um chefe no cadastro do contrato: é o próprio operador
 * dizendo "esta é minha agora", na aba Resumo.
 *
 * Duas consequências que parecem detalhe e não são:
 *
 * 1. **Ao liberar, o nome permanece.** "Pode estar lá como último responsável
 *    que modificou." O campo é registro de quem cuidou por último, não fila de
 *    tarefas — some da lista de pendências, não do histórico.
 * 2. **Só aparece em atenção ou crítico. Em verde, nada.** Obra em dia não tem
 *    o que atribuir, e mostrar um rótulo vazio em 15 cartões verdes é ruído.
 *
 * Ver docs/raw/apresentacao-diretoria.md e etapas-e-status.md (etapa 13).
 */

/** Farol em que a atribuição faz sentido — atenção e crítico. */
export function exigeOperador(farol: Farol): boolean {
  return farol === "AMARELO" || farol === "VERMELHO";
}

export type AtribuicaoOperador = {
  operadorId: string | null;
  operadorNome: string | null;
  operadorAssumidoEm: Date | null;
  operadorLiberadoEm: Date | null;
  operadorObservacao: string | null;
};

export type SituacaoOperador = {
  /** A obra está assumida por alguém agora. */
  assumida: boolean;
  /** Nome a exibir — de quem assumiu, ou do último que mexeu. */
  nome: string | null;
  /** Desde quando está assumida; nulo quando ninguém assumiu. */
  desde: Date | null;
  /** Quando o último operador liberou; nulo quando nunca foi liberada. */
  liberadaEm: Date | null;
  observacao: string | null;
  /** `true` quando o nome é histórico, não atribuição viva. */
  ultimoQueMexeu: boolean;
};

/**
 * Como a tela deve ler os quatro campos do banco.
 *
 * `operadorId` sem `operadorAssumidoEm` é o estado "liberada": o nome fica,
 * mas a obra está livre para quem quiser pegar.
 */
export function situacaoDoOperador(a: AtribuicaoOperador): SituacaoOperador {
  const assumida = a.operadorId !== null && a.operadorAssumidoEm !== null;
  return {
    assumida,
    nome: a.operadorNome,
    desde: assumida ? a.operadorAssumidoEm : null,
    liberadaEm: assumida ? null : a.operadorLiberadoEm,
    // Sem observação viva depois de liberada: a justificativa era daquela
    // atribuição ("aguardando foto"), e mantê-la na tela faria a obra parecer
    // presa a um motivo que já passou.
    observacao: assumida ? a.operadorObservacao : null,
    ultimoQueMexeu: !assumida && a.operadorId !== null,
  };
}

/**
 * Quem pode assumir: qualquer um, desde que a obra esteja livre. Quem já
 * assumiu pode reescrever a própria observação; tomar de outro, não — se duas
 * pessoas mexem na mesma obra, quem está lá libera primeiro.
 */
export function podeAssumir(
  s: SituacaoOperador,
  atribuicao: AtribuicaoOperador,
  usuarioId: string,
): boolean {
  return !s.assumida || atribuicao.operadorId === usuarioId;
}

/** Liberar é do próprio operador. */
export function podeLiberar(
  atribuicao: AtribuicaoOperador,
  usuarioId: string,
): boolean {
  return atribuicao.operadorId === usuarioId && atribuicao.operadorAssumidoEm !== null;
}

/** Limite da observação — é justificativa de uma linha, não relatório. */
export const MAX_OBSERVACAO_OPERADOR = 280;
