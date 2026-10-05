import { diasEntre } from "@/lib/date-br";

/**
 * Suspensão do prazo contratual.
 *
 * Pedido do Junior pela Fernanda em 24/09/2026: *"enquanto ela estiver
 * suspensa tudo para, e depois volta a contar da data final da suspensão"* —
 * e "tudo" é o prazo da obra e o ciclo das medições. Uma obra pode ter mais de
 * uma suspensão, cada uma com data de início e data final; a final fica em
 * branco enquanto a obra continua suspensa.
 *
 * **A regra de contagem, a mesma para o prazo e para a medição:** o relógio
 * para no dia do início e volta a andar no dia final. Os dias entre um e outro
 * empurram o vencimento para a frente, e a contagem de dias restantes fica
 * congelada durante a suspensão — quem estava a 12 dias do término continua a
 * 12 dias até a retomada, e quem já estava vencido continua vencido pelo mesmo
 * número, sem acumular.
 *
 * Nada disto é cache: com a data final em branco a suspensão cresce um dia por
 * dia, então a conta é feita na leitura, como o farol.
 */
export type Suspensao = {
  dataInicio: Date;
  /** Em branco: a obra continua suspensa. */
  dataFim: Date | null;
};

/** Fim efetivo: a data final, ou hoje se a suspensão ainda está aberta. */
function fimAte(s: Suspensao, agora: Date): Date {
  if (s.dataFim) return s.dataFim;
  // Aberta e ainda não começou: não suspendeu nada.
  return diasEntre(s.dataInicio, agora) > 0 ? agora : s.dataInicio;
}

/**
 * Dias de suspensão que empurram um vencimento contado a partir de `desde` —
 * a ordem de início, para o prazo; a última medição, para o ciclo.
 *
 * Conta a suspensão inteira quando ela tem data final, mesmo que ainda não
 * tenha chegado: suspensão programada já prorroga o vencimento. A aberta
 * conta até hoje. O que ficou antes de `desde` não conta — suspensão anterior
 * à última medição não adia a próxima.
 */
export function diasSuspensosDesde(
  suspensoes: Suspensao[],
  desde: Date,
  agora: Date,
): number {
  return suspensoes.reduce((total, s) => {
    const inicio = diasEntre(desde, s.dataInicio) > 0 ? s.dataInicio : desde;
    return total + Math.max(0, diasEntre(inicio, fimAte(s, agora)));
  }, 0);
}

/**
 * Dias de suspensão já vividos entre `desde` e hoje — o que sai dos dias
 * decorridos, para o prazo transcorrido parar de subir enquanto a obra está
 * suspensa.
 */
export function diasSuspensosAteHoje(
  suspensoes: Suspensao[],
  desde: Date,
  agora: Date,
): number {
  return suspensoes.reduce((total, s) => {
    const inicio = diasEntre(desde, s.dataInicio) > 0 ? s.dataInicio : desde;
    const fim = fimAte(s, agora);
    const ate = diasEntre(fim, agora) >= 0 ? fim : agora;
    return total + Math.max(0, diasEntre(inicio, ate));
  }, 0);
}

/**
 * A suspensão que vale hoje, se houver: começou e ainda não terminou. É o que
 * a tela mostra como "Prazo suspenso desde…".
 */
export function suspensaoEmCurso(
  suspensoes: Suspensao[],
  agora: Date,
): Suspensao | null {
  return (
    suspensoes.find(
      (s) =>
        diasEntre(s.dataInicio, agora) >= 0 &&
        (s.dataFim === null || diasEntre(agora, s.dataFim) > 0),
    ) ?? null
  );
}

/** Duração de uma suspensão, em dias — até hoje, se ainda estiver aberta. */
export function duracaoDaSuspensao(s: Suspensao, agora: Date): number {
  return Math.max(0, diasEntre(s.dataInicio, fimAte(s, agora)));
}

/**
 * O que está errado numa suspensão que vai ser gravada, ou `null`.
 *
 * `outras` são as demais suspensões da obra — na edição, sem a própria.
 */
export function erroNaSuspensao(
  nova: Suspensao,
  outras: Suspensao[],
  dataOrdemInicio: Date | null,
): string | null {
  if (!dataOrdemInicio) {
    return "Informe a ordem de início da obra antes de lançar suspensão — o prazo só começa a contar a partir dela.";
  }
  if (diasEntre(dataOrdemInicio, nova.dataInicio) < 0) {
    return "A suspensão não pode começar antes da ordem de início.";
  }
  if (nova.dataFim && diasEntre(nova.dataInicio, nova.dataFim) <= 0) {
    return "A data final precisa ser depois da data de início.";
  }
  // Dois intervalos [início, fim) se cruzam quando cada um começa antes do
  // outro terminar. Fim em branco é "até hoje e além". Encostar é permitido:
  // uma termina no dia em que a outra começa.
  const cruza = outras.some(
    (o) =>
      (o.dataFim === null || diasEntre(nova.dataInicio, o.dataFim) > 0) &&
      (nova.dataFim === null || diasEntre(o.dataInicio, nova.dataFim) > 0),
  );
  if (cruza) {
    return "Esta suspensão se sobrepõe a outra já lançada. Ajuste as datas — um mesmo dia não pode ser suspenso duas vezes.";
  }
  return null;
}
