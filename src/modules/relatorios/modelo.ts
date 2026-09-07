import { Decimal } from "decimal.js";

import { formatarCompetencia, formatarData, formatarDataHora } from "@/lib/date-br";
import { dec, formatarBRL, formatarPercentual } from "@/lib/money";

/**
 * Modelo neutro de relatório.
 *
 * Os geradores (XLSX e PDF) só conhecem esta estrutura — nunca o banco, nunca
 * Prisma, nunca React. Quem monta um relatório novo escreve uma função que
 * devolve `Relatorio` e ganha os dois formatos de graça.
 *
 * O conteúdo dos relatórios ainda depende da 1ª reunião (ponto #10). Esta
 * camada é justamente a parte que não depende: o que muda depois são as
 * colunas e as consultas, não a mecânica de exportar.
 */

export type TipoColuna =
  | "texto"
  | "numero"
  | "dinheiro"
  | "percentual"
  | "data"
  | "datahora";

export type Coluna = {
  chave: string;
  rotulo: string;
  tipo?: TipoColuna;
  /** Peso relativo da largura no PDF e base da largura no XLSX. */
  peso?: number;
};

/**
 * Uma célula carrega o texto já formatado em pt-BR (o que o PDF imprime) e,
 * quando faz sentido, o valor numérico cru (o que a planilha soma).
 *
 * `numero` é o único ponto do sistema onde dinheiro vira `number`: a célula do
 * Excel não tem tipo decimal, então a conversão acontece aqui, na formatação
 * final, e não antes.
 */
export type Celula = {
  texto: string;
  numero?: number | null;
};

export type Linha = Celula[];

export type Filtro = { rotulo: string; valor: string };

export type Relatorio = {
  titulo: string;
  subtitulo?: string | null;
  /** Filtros aplicados, impressos no cabeçalho para o relatório ser auditável. */
  filtros?: Filtro[];
  colunas: Coluna[];
  linhas: Linha[];
  /** Linha de totais, destacada no rodapé da tabela. */
  totais?: Linha | null;
  geradoEm: Date;
  geradoPor?: string | null;
  observacao?: string | null;
  orientacao?: "retrato" | "paisagem";
};

/** Marcador de campo vazio, o mesmo que as telas usam. */
export const VAZIO = "—";

export function texto(valor: string | null | undefined): Celula {
  return { texto: valor?.trim() ? valor : VAZIO };
}

/**
 * Célula deliberadamente em branco.
 *
 * Diferente de `texto(null)`: ali o dado existe e falta, e o "—" diz isso. Aqui
 * a coluna não se aplica — numa linha de totais, "—" embaixo de "Data" seria
 * ruído, não informação.
 */
export function branco(): Celula {
  return { texto: "" };
}

export function numero(valor: number | null | undefined): Celula {
  if (valor === null || valor === undefined) return { texto: VAZIO, numero: null };
  return { texto: new Intl.NumberFormat("pt-BR").format(valor), numero: valor };
}

export function dinheiro(valor: Decimal.Value | null | undefined): Celula {
  if (valor === null || valor === undefined) return { texto: VAZIO, numero: null };
  const d = dec(valor);
  return { texto: formatarBRL(d), numero: d.toNumber() };
}

export function percentual(valor: Decimal.Value | null | undefined): Celula {
  if (valor === null || valor === undefined) return { texto: VAZIO, numero: null };
  const d = dec(valor);
  // A planilha guarda a fração (0,25) porque o formato de porcentagem do Excel
  // multiplica por 100 na exibição; o PDF imprime "25,00%".
  return { texto: formatarPercentual(d), numero: d.dividedBy(100).toNumber() };
}

/** Dia 0 do calendário do Excel: 30/12/1899. */
const EPOCA_EXCEL = Date.UTC(1899, 11, 30);
const MS_POR_DIA = 86_400_000;

/**
 * Serial de data do Excel. Usa os componentes locais da data, não o UTC: uma
 * medição de 01/09 salva como 01/09T12:00 no fuso de São Paulo tem que virar
 * 01/09 na planilha, não 31/08.
 */
export function serialExcel(d: Date, comHora = false): number {
  const dias =
    (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCA_EXCEL) / MS_POR_DIA;
  if (!comHora) return dias;
  const fracao = (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86_400;
  return dias + fracao;
}

export function data(valor: Date | null | undefined): Celula {
  if (!valor) return { texto: VAZIO, numero: null };
  return { texto: formatarData(valor), numero: serialExcel(valor) };
}

export function dataHora(valor: Date | null | undefined): Celula {
  if (!valor) return { texto: VAZIO, numero: null };
  return { texto: formatarDataHora(valor), numero: serialExcel(valor, true) };
}

/** Competência de medição: "09/2026" no PDF, data real na planilha. */
export function competencia(valor: Date | null | undefined): Celula {
  if (!valor) return { texto: VAZIO, numero: null };
  return { texto: formatarCompetencia(valor), numero: serialExcel(valor) };
}

export function tipoDaColuna(c: Coluna): TipoColuna {
  return c.tipo ?? "texto";
}

/** Colunas numéricas alinham à direita; o resto, à esquerda. */
export function alinhaADireita(c: Coluna): boolean {
  const t = tipoDaColuna(c);
  return t === "numero" || t === "dinheiro" || t === "percentual";
}
