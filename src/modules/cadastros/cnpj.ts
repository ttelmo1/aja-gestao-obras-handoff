/**
 * Validação de CNPJ.
 *
 * Aceita o formato **alfanumérico**, obrigatório desde julho de 2026 (Nota
 * Técnica Cofis/SERPRO 2024.001): os 12 primeiros caracteres passam a admitir
 * letras, e só os 2 dígitos verificadores continuam numéricos. O cálculo é o
 * mesmo módulo 11 de sempre, com uma diferença — cada caractere entra pelo seu
 * código ASCII menos 48, o que faz "0"→0, "9"→9, "A"→17, "Z"→42.
 *
 * Numerais antigos continuam válidos e passam pela mesma conta, porque para
 * dígitos ASCII−48 devolve o próprio valor. Não há dois caminhos aqui.
 */

const PESOS_PRIMEIRO = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_SEGUNDO = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/** Remove pontuação de máscara e normaliza para maiúsculas. */
export function limparCnpj(valor: string): string {
  return valor.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

function valorDoCaractere(c: string): number {
  return c.charCodeAt(0) - 48;
}

function digitoVerificador(base: string, pesos: number[]): number {
  const soma = base
    .split("")
    .reduce((acc, c, i) => acc + valorDoCaractere(c) * pesos[i]!, 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function validarCnpj(valor: string): boolean {
  const cnpj = limparCnpj(valor);
  if (cnpj.length !== 14) return false;
  // Os 12 primeiros podem ser letra ou número; os 2 últimos, só número.
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(cnpj)) return false;
  // Sequências repetidas passam no módulo 11 mas não existem na Receita.
  if (/^(.)\1{13}$/.test(cnpj)) return false;

  const base = cnpj.slice(0, 12);
  const dv1 = digitoVerificador(base, PESOS_PRIMEIRO);
  const dv2 = digitoVerificador(base + dv1, PESOS_SEGUNDO);
  return cnpj.slice(12) === `${dv1}${dv2}`;
}

/** Aplica a máscara 00.000.000/0000-00 — serve igual para o alfanumérico. */
export function formatarCnpj(valor: string | null | undefined): string {
  if (!valor) return "";
  const c = limparCnpj(valor);
  if (c.length !== 14) return valor;
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
}
