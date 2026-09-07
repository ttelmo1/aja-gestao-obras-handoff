import { formatarDataHora } from "@/lib/date-br";

import {
  type Celula,
  type Coluna,
  type Linha,
  type Relatorio,
  tipoDaColuna,
  type TipoColuna,
} from "./modelo";
import { zipar } from "./zip";

/**
 * Gerador de XLSX escrito à mão sobre `zip.ts`.
 *
 * O ponto de exportar em planilha é o cliente poder somar, filtrar e dinamizar
 * — então dinheiro, percentual e data saem como número de verdade com formato
 * aplicado, nunca como texto. Se saíssem como texto, a exportação seria só um
 * PDF em outra roupa.
 */

// Caracteres de controle são inválidos em XML 1.0 e fazem o Excel recusar o
// arquivo inteiro; tirar é mais útil que deixar a planilha não abrir.
const CONTROLE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g;

export function escaparXml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(CONTROLE, "");
}

/** 0 → "A", 25 → "Z", 26 → "AA". */
export function letraDaColuna(indice: number): string {
  let n = indice + 1;
  let letra = "";
  while (n > 0) {
    const resto = (n - 1) % 26;
    letra = String.fromCharCode(65 + resto) + letra;
    n = Math.floor((n - 1) / 26);
  }
  return letra;
}

// Índices em `cellXfs`, na ordem em que styles.xml os declara.
const ESTILO = {
  texto: 0,
  numero: 1,
  dinheiro: 2,
  percentual: 3,
  data: 4,
  datahora: 5,
  cabecalho: 6,
  titulo: 7,
  subtitulo: 8,
} as const;

/** Os estilos em negrito repetem os normais, deslocados de um bloco. */
const DESLOCAMENTO_NEGRITO = 9;

function estiloDoTipo(tipo: TipoColuna, negrito: boolean): number {
  const base = ESTILO[tipo];
  return negrito ? base + DESLOCAMENTO_NEGRITO : base;
}

function celulaXml(
  referencia: string,
  celula: Celula | undefined,
  coluna: Coluna,
  negrito: boolean,
): string {
  const tipo = tipoDaColuna(coluna);
  const estilo = estiloDoTipo(tipo, negrito);

  if (celula && celula.numero !== null && celula.numero !== undefined) {
    return `<c r="${referencia}" s="${estilo}"><v>${celula.numero}</v></c>`;
  }

  const texto = celula?.texto ?? "";
  if (!texto) return `<c r="${referencia}" s="${estilo}"/>`;

  // Célula com texto nunca leva formato de número, mesmo em coluna de dinheiro
  // ou data: o marcador "—" sob um formato "dd/mm/yyyy" faz o Excel acusar
  // conteúdo incompatível com o formato.
  const estiloDeTexto = estiloDoTipo("texto", negrito);
  return `<c r="${referencia}" s="${estiloDeTexto}" t="inlineStr"><is><t xml:space="preserve">${escaparXml(texto)}</t></is></c>`;
}

function linhaXml(
  linha: Linha,
  colunas: Coluna[],
  numero: number,
  negrito: boolean,
): string {
  const celulas = colunas
    .map((coluna, i) =>
      celulaXml(`${letraDaColuna(i)}${numero}`, linha[i], coluna, negrito),
    )
    .join("");
  return `<row r="${numero}">${celulas}</row>`;
}

function textoSolto(texto: string, numeroDaLinha: number, estilo: number): string {
  return `<row r="${numeroDaLinha}"><c r="A${numeroDaLinha}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${escaparXml(texto)}</t></is></c></row>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="5">
<numFmt numFmtId="164" formatCode="&quot;R$&quot;\\ #,##0.00"/>
<numFmt numFmtId="165" formatCode="0.00%"/>
<numFmt numFmtId="166" formatCode="dd/mm/yyyy"/>
<numFmt numFmtId="167" formatCode="dd/mm/yyyy\\ hh:mm"/>
<numFmt numFmtId="168" formatCode="#,##0"/>
</numFmts>
<fonts count="5">
<font><sz val="10"/><name val="Calibri"/></font>
<font><b/><sz val="10"/><name val="Calibri"/></font>
<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="14"/><color rgb="FF17324D"/><name val="Calibri"/></font>
<font><sz val="10"/><color rgb="FF6F7D8C"/><name val="Calibri"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF17324D"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="18">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="168" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="167" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="168" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
<xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
<xf numFmtId="165" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
<xf numFmtId="166" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
<xf numFmtId="167" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>
</cellXfs>
</styleSheet>`;

/** Largura da coluna na unidade do Excel (aproximadamente caracteres). */
function larguraDaColuna(c: Coluna): number {
  const base = Math.max(c.rotulo.length + 4, 12);
  const peso = c.peso && c.peso > 0 ? c.peso : 1;
  return Math.min(60, Math.round(base * Math.max(1, peso) * 10) / 10);
}

/** Nome de aba do Excel: até 31 caracteres, sem os que o formato proíbe. */
export function nomeDaAba(titulo: string): string {
  const limpo = titulo.replace(/[\\/?*[\]:]/g, " ").trim();
  return (limpo || "Relatório").slice(0, 31);
}

export function gerarXlsx(relatorio: Relatorio): Uint8Array {
  const { colunas, linhas } = relatorio;
  const partes: string[] = [];
  let numeroDaLinha = 1;

  partes.push(textoSolto(relatorio.titulo, numeroDaLinha++, ESTILO.titulo));
  if (relatorio.subtitulo) {
    partes.push(textoSolto(relatorio.subtitulo, numeroDaLinha++, ESTILO.subtitulo));
  }
  partes.push(
    textoSolto(
      `Gerado em ${formatarDataHora(relatorio.geradoEm)}` +
        (relatorio.geradoPor ? ` por ${relatorio.geradoPor}` : ""),
      numeroDaLinha++,
      ESTILO.subtitulo,
    ),
  );
  for (const filtro of relatorio.filtros ?? []) {
    partes.push(
      textoSolto(`${filtro.rotulo}: ${filtro.valor}`, numeroDaLinha++, ESTILO.subtitulo),
    );
  }
  numeroDaLinha++; // linha em branco separando o cabeçalho da tabela

  const linhaDoCabecalho = numeroDaLinha;
  partes.push(
    `<row r="${linhaDoCabecalho}" ht="18" customHeight="1">` +
      colunas
        .map(
          (c, i) =>
            `<c r="${letraDaColuna(i)}${linhaDoCabecalho}" s="${ESTILO.cabecalho}" t="inlineStr"><is><t xml:space="preserve">${escaparXml(c.rotulo)}</t></is></c>`,
        )
        .join("") +
      "</row>",
  );
  numeroDaLinha++;

  const primeiraDeDados = numeroDaLinha;
  for (const linha of linhas) {
    partes.push(linhaXml(linha, colunas, numeroDaLinha++, false));
  }
  const ultimaDeDados = Math.max(primeiraDeDados, numeroDaLinha - 1);

  if (relatorio.totais) {
    partes.push(linhaXml(relatorio.totais, colunas, numeroDaLinha++, true));
  }
  if (relatorio.observacao) {
    numeroDaLinha++;
    partes.push(textoSolto(relatorio.observacao, numeroDaLinha++, ESTILO.subtitulo));
  }

  const ultimaColuna = letraDaColuna(Math.max(0, colunas.length - 1));
  const cols = colunas
    .map(
      (c, i) =>
        `<col min="${i + 1}" max="${i + 1}" width="${larguraDaColuna(c)}" customWidth="1"/>`,
    )
    .join("");

  // O painel congelado na linha do cabeçalho é o que faz a planilha continuar
  // legível quando o cliente rola 400 medições.
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="${linhaDoCabecalho}" topLeftCell="A${linhaDoCabecalho + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="14"/>
<cols>${cols}</cols>
<sheetData>${partes.join("")}</sheetData>
${linhas.length > 0 ? `<autoFilter ref="A${linhaDoCabecalho}:${ultimaColuna}${ultimaDeDados}"/>` : ""}
</worksheet>`;

  const arquivos: Array<{ nome: string; conteudo: string }> = [
    {
      nome: "[Content_Types].xml",
      conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    },
    {
      nome: "_rels/.rels",
      conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      nome: "xl/workbook.xml",
      conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${escaparXml(nomeDaAba(relatorio.titulo))}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    },
    {
      nome: "xl/_rels/workbook.xml.rels",
      conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    { nome: "xl/styles.xml", conteudo: STYLES },
    { nome: "xl/worksheets/sheet1.xml", conteudo: sheet },
  ];

  return zipar(
    arquivos.map((a) => ({ nome: a.nome, dados: Buffer.from(a.conteudo, "utf8") })),
  );
}
