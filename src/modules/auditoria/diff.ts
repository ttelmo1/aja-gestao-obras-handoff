/**
 * Diferença entre dois estados para a trilha de auditoria.
 *
 * Vive fora de `registrar.ts` porque é função pura e aquele arquivo importa o
 * client do Prisma — sem isto, testar a comparação exigiria banco de pé.
 */
const NUMERICO = /^-?\d+(\.\d+)?$/;

/**
 * Dois valores representam o mesmo dado?
 *
 * Comparar só por `String` marcaria dinheiro como alterado toda vez: o
 * `Decimal` do banco vira "260000" e o do formulário vira "260000.00". Isso
 * enchia a auditoria de mudanças que não aconteceram — abrir o formulário e
 * salvar já gerava registro.
 */
function mesmoValor(a: unknown, b: unknown): boolean {
  const sa = String(a);
  const sb = String(b);
  if (sa === sb) return true;
  if (NUMERICO.test(sa) && NUMERICO.test(sb)) return Number(sa) === Number(sb);
  return false;
}

/**
 * Diferença entre dois estados, só com os campos que mudaram — mantém o log
 * legível e a tabela enxuta em entidades largas como Obra.
 */
export function diff<T extends Record<string, unknown>>(
  antes: T,
  depois: Partial<T>,
): { antes: Partial<T>; depois: Partial<T> } {
  const a: Partial<T> = {};
  const d: Partial<T> = {};
  for (const chave of Object.keys(depois) as Array<keyof T>) {
    if (!mesmoValor(antes[chave], depois[chave])) {
      a[chave] = antes[chave];
      d[chave] = depois[chave];
    }
  }
  return { antes: a, depois: d };
}
