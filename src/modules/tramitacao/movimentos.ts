import { diasEntre } from "@/lib/date-br";

/**
 * Tempo de permanência por setor (requisitos.md 1.5).
 *
 * **Módulo em espera desde 17/09/2026.** A tramitação saiu da interface e o
 * farol passou a ter dois critérios (ponto #23): nada em `src/app/` chama
 * estas funções hoje. O módulo e seus testes ficam de pé porque a decisão foi
 * de tela, não de modelo — as tabelas continuam no banco e um `git revert`
 * devolve as páginas. Se o cliente confirmar que não volta, isto sai junto com
 * o schema.
 *
 * A regra central do módulo é uma só: **movimento sem data de saída é
 * processo parado**. É dele que saíam o "há N dias na Controladoria" do
 * mockup, o indicador "Processos parados" do painel e o critério `diasParado`
 * do farol.
 *
 * Nada aqui é persistido como verdade: `EtapaObra.diasPermanencia` é cache
 * recalculado na escrita, e o tempo do movimento aberto muda sozinho a cada
 * dia que passa — guardar seria garantir número velho na tela.
 */
export type MovimentoParaCalculo = {
  dataEntrada: Date;
  dataSaida: Date | null;
};

/**
 * Dias que o processo passou (ou está passando) no setor. Movimento aberto
 * conta até hoje; fechado conta até a saída.
 */
export function diasNoSetor(
  m: MovimentoParaCalculo,
  agora: Date = new Date(),
): number {
  return diasEntre(m.dataEntrada, m.dataSaida ?? agora);
}

export type SituacaoTramitacao<T extends MovimentoParaCalculo> = {
  /** O movimento em aberto que está parado há mais tempo, se houver. */
  atual: T | null;
  /** Dias parado em `atual`. `null` quando não há movimento aberto. */
  diasParado: number | null;
  /** Quantos processos estão em aberto ao mesmo tempo. */
  abertos: number;
  /** Soma dos dias de todos os movimentos, abertos e fechados. */
  diasTotais: number;
  /** Maior permanência num único setor — o "maior tempo parado" do mockup. */
  maiorPermanencia: number;
  quantidadeMovimentos: number;
};

/**
 * Situação da tramitação a partir da lista de movimentos.
 *
 * Num percurso único — o de uma medição, ou o de uma etapa que não seja
 * MEDICOES — existe no máximo um movimento aberto, e ele é o `atual`.
 *
 * Na visão agregada da etapa MEDICOES pode haver vários, porque cada medição
 * caminha sozinha. Aí `atual` é o que está parado **há mais tempo**, não o
 * mais recente: quem olha a faixa do fluxo quer ver o pior caso, que é o que
 * o painel vai cobrar. `abertos` diz quantos são, para a tela não dar a
 * entender que é só aquele.
 */
export function situacaoDaTramitacao<T extends MovimentoParaCalculo>(
  movimentos: T[],
  agora: Date = new Date(),
): SituacaoTramitacao<T> {
  const abertos = movimentos.filter((m) => m.dataSaida === null);
  const atual =
    abertos.length === 0
      ? null
      : abertos.reduce((pior, m) => (m.dataEntrada < pior.dataEntrada ? m : pior));

  let diasTotais = 0;
  let maiorPermanencia = 0;
  for (const m of movimentos) {
    const dias = diasNoSetor(m, agora);
    diasTotais += dias;
    if (dias > maiorPermanencia) maiorPermanencia = dias;
  }

  return {
    atual,
    diasParado: atual ? diasNoSetor(atual, agora) : null,
    abertos: abertos.length,
    diasTotais,
    maiorPermanencia,
    quantidadeMovimentos: movimentos.length,
  };
}

/**
 * O processo está parado há mais tempo do que o aceitável?
 *
 * O limite vem do farol (`LIMITES_PROVISORIOS.diasParadoAlerta`) e é passado
 * de fora de propósito: quem decide o que é "muito tempo" é o motor do farol,
 * não este módulo. Ainda é critério provisório — ponto #1 da reunião.
 */
export function estaParadoDemais(
  situacao: SituacaoTramitacao<MovimentoParaCalculo>,
  limiteDias: number,
): boolean {
  return situacao.diasParado !== null && situacao.diasParado >= limiteDias;
}

export type ErroDeMovimento =
  | "SAIDA_ANTES_DA_ENTRADA"
  | "JA_EXISTE_ABERTO"
  | "ENTRADA_ANTES_DA_ANTERIOR";

/**
 * Um processo está num setor de cada vez. Deixar dois movimentos abertos faria
 * a mesma medição aparecer parada em dois lugares, e o "há N dias" perderia
 * sentido — por isso a entrada nova exige que a anterior tenha saída.
 */
export function validarNovaEntrada(
  movimentos: MovimentoParaCalculo[],
  dataEntrada: Date,
): ErroDeMovimento | null {
  if (movimentos.some((m) => m.dataSaida === null)) return "JA_EXISTE_ABERTO";

  const ultimaSaida = movimentos.reduce<Date | null>(
    (maior, m) =>
      m.dataSaida && (maior === null || m.dataSaida > maior) ? m.dataSaida : maior,
    null,
  );
  if (ultimaSaida && dataEntrada < ultimaSaida) return "ENTRADA_ANTES_DA_ANTERIOR";
  return null;
}

export function validarSaida(
  movimento: MovimentoParaCalculo,
  dataSaida: Date,
): ErroDeMovimento | null {
  return dataSaida < movimento.dataEntrada ? "SAIDA_ANTES_DA_ENTRADA" : null;
}

export const MENSAGENS_ERRO: Record<ErroDeMovimento, string> = {
  SAIDA_ANTES_DA_ENTRADA: "A saída não pode ser anterior à entrada no setor.",
  JA_EXISTE_ABERTO:
    "O processo já está em um setor sem saída registrada. Registre a saída antes de encaminhá-lo adiante.",
  ENTRADA_ANTES_DA_ANTERIOR:
    "A entrada não pode ser anterior à saída do setor anterior.",
};

/**
 * Dias que a obra está parada — o maior tempo entre os movimentos em aberto.
 *
 * É o maior, e não a soma nem a média: se o processo de uma medição está há
 * 40 dias na Controladoria e o de outra entrou ontem em Protocolo, a obra tem
 * um problema de 40 dias. Diluir isso numa média esconderia exatamente o caso
 * que o painel existe para mostrar.
 *
 * Devolve `null` quando nada está em aberto — diferente de zero, que diria
 * "parado há zero dias" e acenderia o farol de uma obra que só está andando.
 */
export function diasParadoDaObra(
  movimentosAbertos: MovimentoParaCalculo[],
  agora: Date = new Date(),
): number | null {
  if (movimentosAbertos.length === 0) return null;
  return movimentosAbertos.reduce(
    (maior, m) => Math.max(maior, diasNoSetor(m, agora)),
    0,
  );
}
