/**
 * Métricas e codificação das fontes base do PDF.
 *
 * O PDF usa Helvetica e Helvetica-Bold, que são duas das 14 fontes que todo
 * leitor de PDF já traz — não embutimos arquivo de fonte, o que mantém o
 * gerador sem dependência e o arquivo pequeno.
 *
 * O preço é este módulo: sem a tabela de larguras não dá para alinhar coluna à
 * direita, centralizar título nem cortar texto que não cabe.
 */

// Larguras em milésimos de em, da AFM da Helvetica.
const REGULAR: Record<string, number> = {
  " ": 278, "!": 278, '"': 355, "#": 556, $: 556, "%": 889, "&": 667, "'": 191,
  "(": 333, ")": 333, "*": 389, "+": 584, ",": 278, "-": 333, ".": 278, "/": 278,
  ":": 278, ";": 278, "<": 584, "=": 584, ">": 584, "?": 556, "@": 1015,
  A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278,
  J: 500, K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722,
  S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  "[": 278, "\\": 278, "]": 278, "^": 469, _: 556, "`": 333,
  a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222,
  j: 222, k: 500, l: 222, m: 833, n: 556, o: 556, p: 556, q: 556, r: 333,
  s: 500, t: 278, u: 556, v: 500, w: 722, x: 500, y: 500, z: 500,
  "{": 334, "|": 260, "}": 334, "~": 584,
  "\u00a0": 278, "\u00aa": 370, "\u00ba": 365, "\u00b0": 400, "\u00a7": 556,
  "\u2013": 556, "\u2014": 1000, "\u2026": 1000, "\u2022": 350,
};

const NEGRITO: Record<string, number> = {
  " ": 278, "!": 333, '"': 474, "#": 556, $: 556, "%": 889, "&": 722, "'": 238,
  "(": 333, ")": 333, "*": 389, "+": 584, ",": 278, "-": 333, ".": 278, "/": 278,
  ":": 333, ";": 333, "<": 584, "=": 584, ">": 584, "?": 611, "@": 975,
  A: 722, B: 722, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278,
  J: 556, K: 722, L: 611, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722,
  S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  "[": 333, "\\": 278, "]": 333, "^": 584, _: 556, "`": 333,
  a: 556, b: 611, c: 556, d: 611, e: 556, f: 333, g: 611, h: 611, i: 278,
  j: 278, k: 556, l: 278, m: 889, n: 611, o: 611, p: 611, q: 611, r: 389,
  s: 556, t: 333, u: 611, v: 556, w: 778, x: 556, y: 556, z: 500,
  "{": 389, "|": 280, "}": 389, "~": 584,
  "\u00a0": 278, "\u00aa": 370, "\u00ba": 365, "\u00b0": 400, "\u00a7": 556,
  "\u2013": 556, "\u2014": 1000, "\u2026": 1000, "\u2022": 350,
};

for (const d of "0123456789") {
  REGULAR[d] = 556;
  NEGRITO[d] = 556;
}

const ACENTO = /[\u0300-\u036f]/g;

/** "á" → "a": na Helvetica o glifo acentuado tem a largura da letra base. */
function semAcento(c: string): string {
  return c.normalize("NFD").replace(ACENTO, "");
}

function larguraDoCaractere(c: string, negrito: boolean): number {
  const tabela = negrito ? NEGRITO : REGULAR;
  const direta = tabela[c];
  if (direta !== undefined) return direta;
  const base = tabela[semAcento(c)];
  if (base !== undefined) return base;
  return negrito ? 611 : 556;
}

/** Largura do texto em pontos, no tamanho dado. */
export function larguraDoTexto(texto: string, tamanho: number, negrito = false): number {
  let total = 0;
  for (const c of texto) total += larguraDoCaractere(c, negrito);
  return (total * tamanho) / 1000;
}

/**
 * Corta o texto para caber em `maxima`, terminando em reticências.
 * Devolve o texto intacto quando já cabe — o caso comum.
 */
export function cortarPara(
  texto: string,
  maxima: number,
  tamanho: number,
  negrito = false,
): string {
  if (larguraDoTexto(texto, tamanho, negrito) <= maxima) return texto;

  const reticencias = "\u2026";
  const sobra = maxima - larguraDoTexto(reticencias, tamanho, negrito);
  if (sobra <= 0) return "";

  let largura = 0;
  let corte = "";
  for (const c of texto) {
    const proxima = largura + larguraDoCaractere(c, negrito) * (tamanho / 1000);
    if (proxima > sobra) break;
    largura = proxima;
    corte += c;
  }
  return corte.trimEnd() + reticencias;
}

// Caracteres da faixa 0x80–0x9F da WinAnsiEncoding, que não seguem o Latin-1.
const WIN_ANSI_ESPECIAIS: Record<string, number> = {
  "\u20ac": 0x80, "\u201a": 0x82, "\u0192": 0x83, "\u201e": 0x84,
  "\u2026": 0x85, "\u2020": 0x86, "\u2021": 0x87, "\u02c6": 0x88,
  "\u2030": 0x89, "\u0160": 0x8a, "\u2039": 0x8b, "\u0152": 0x8c,
  "\u017d": 0x8e, "\u2018": 0x91, "\u2019": 0x92, "\u201c": 0x93,
  "\u201d": 0x94, "\u2022": 0x95, "\u2013": 0x96, "\u2014": 0x97,
  "\u02dc": 0x98, "\u2122": 0x99, "\u0161": 0x9a, "\u203a": 0x9b,
  "\u0153": 0x9c, "\u017e": 0x9e, "\u0178": 0x9f,
};

/**
 * Texto para WinAnsiEncoding, devolvido como string latin1 (um caractere por
 * byte) pronta para `Buffer.from(s, "latin1")`.
 *
 * O que não existe na codificação perde o acento antes de virar "?", para que
 * um caractere exótico não estrague a palavra inteira.
 */
export function paraWinAnsi(texto: string): string {
  let saida = "";
  for (const c of texto) {
    const especial = WIN_ANSI_ESPECIAIS[c];
    if (especial !== undefined) {
      saida += String.fromCharCode(especial);
      continue;
    }
    const codigo = c.codePointAt(0) ?? 63;
    if (codigo >= 0x20 && codigo <= 0x7e) {
      saida += c;
      continue;
    }
    if (codigo >= 0xa0 && codigo <= 0xff) {
      saida += c;
      continue;
    }
    const base = semAcento(c);
    saida += base && base !== c ? paraWinAnsi(base) : "?";
  }
  return saida;
}

/** Escapa o que o PDF trata como sintaxe dentro de uma string literal. */
export function escaparPdf(texto: string): string {
  return paraWinAnsi(texto).replace(/[\\()]/g, "\\$&").replace(/[\r\n]/g, " ");
}
