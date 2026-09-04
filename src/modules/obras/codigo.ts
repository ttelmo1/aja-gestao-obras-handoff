/**
 * Código interno da obra.
 *
 * Formato `OBR-<ano>-<sequência de 3 dígitos>`, reiniciando a cada ano — é o
 * padrão que o setor público usa em numeração de processo. O usuário pode
 * digitar o código que quiser; esta função só sugere o próximo quando o campo
 * vem vazio, para ninguém precisar consultar a lista antes de cadastrar.
 *
 * A sequência olha o maior número já usado no ano, não a quantidade de obras:
 * apagar a obra 003 não faz a próxima nascer 003 de novo e colidir com um
 * código que já circulou em papel.
 */
const PADRAO = /^OBR-(\d{4})-(\d{3,})$/;

export function proximoCodigo(ano: number, codigosExistentes: string[]): string {
  const maior = codigosExistentes.reduce((max, codigo) => {
    const m = PADRAO.exec(codigo.trim().toUpperCase());
    if (!m || Number(m[1]) !== ano) return max;
    return Math.max(max, Number(m[2]));
  }, 0);

  return `OBR-${ano}-${String(maior + 1).padStart(3, "0")}`;
}
