import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Decimal } from "decimal.js";

import {
  branco,
  competencia,
  data,
  dinheiro,
  numero,
  percentual,
  serialExcel,
  texto,
  VAZIO,
  type Relatorio,
} from "@/modules/relatorios/modelo";
import {
  cortarPara,
  escaparPdf,
  larguraDoTexto,
  paraWinAnsi,
} from "@/modules/relatorios/fontes";
import { crc32, zipar } from "@/modules/relatorios/zip";
import { inflateRawSync } from "node:zlib";
import { escaparXml, gerarXlsx, letraDaColuna, nomeDaAba } from "@/modules/relatorios/xlsx";
import { gerarPdf, larguraDasColunas, paginar } from "@/modules/relatorios/pdf";
import {
  apelido,
  exportar,
  lerFormato,
  nomeDoArquivo,
} from "@/modules/relatorios/exportar";

const em = (iso: string) => new Date(`${iso}T12:00:00`);

/**
 * Extrai uma parte do XLSX lendo os cabeçalhos locais do ZIP.
 * Existe para o teste conseguir olhar o XML que o Excel vai ler — sem isso,
 * dava só para conferir que o arquivo é um zip.
 */
function parteDoZip(zip: Buffer, procurada: string): string {
  let i = 0;
  while (zip.readUInt32LE(i) === 0x04034b50) {
    const comprimido = zip.readUInt32LE(i + 18);
    const tamanhoDoNome = zip.readUInt16LE(i + 26);
    const extra = zip.readUInt16LE(i + 28);
    const nome = zip.subarray(i + 30, i + 30 + tamanhoDoNome).toString("utf8");
    const inicio = i + 30 + tamanhoDoNome + extra;
    if (nome === procurada) {
      return inflateRawSync(zip.subarray(inicio, inicio + comprimido)).toString("utf8");
    }
    i = inicio + comprimido;
  }
  throw new Error(`parte ${procurada} não encontrada`);
}

function relatorioDeTeste(quantidadeDeLinhas: number): Relatorio {
  return {
    titulo: "Obras em execução",
    subtitulo: "Todas as unidades",
    filtros: [{ rotulo: "Status", valor: "Em execução" }],
    colunas: [
      { chave: "obra", rotulo: "Obra", peso: 3 },
      { chave: "valor", rotulo: "Valor", tipo: "dinheiro" },
      { chave: "pct", rotulo: "% medido", tipo: "percentual" },
      { chave: "inicio", rotulo: "Início", tipo: "data" },
    ],
    linhas: Array.from({ length: quantidadeDeLinhas }, (_, i) => [
      texto(`Obra ${i + 1}`),
      dinheiro(new Decimal("125000.50")),
      percentual(new Decimal("42.5")),
      data(em("2026-03-15")),
    ]),
    totais: [texto("Total"), dinheiro(new Decimal("125000.50")), branco(), branco()],
    geradoEm: em("2026-09-07"),
    geradoPor: "Administrador",
  };
}

describe("células do relatório", () => {
  it("guarda o texto em pt-BR e o número cru lado a lado", () => {
    // O PDF imprime o texto; a planilha soma o número. Uma célula carrega os
    // dois para os dois geradores lerem a mesma fonte.
    const c = dinheiro(new Decimal("1234.5"));
    assert.match(c.texto, /1\.234,50/);
    assert.equal(c.numero, 1234.5);
  });

  it("percentual vai como fração para a planilha", () => {
    // O formato de porcentagem do Excel multiplica por 100 na exibição: gravar
    // 25 mostraria 2500%.
    const c = percentual(new Decimal("25"));
    assert.equal(c.texto, "25,00%");
    assert.equal(c.numero, 0.25);
  });

  it("valor ausente vira marcador sem número", () => {
    for (const c of [dinheiro(null), percentual(undefined), data(null), numero(null)]) {
      assert.equal(c.texto, VAZIO);
      assert.equal(c.numero, null);
    }
    assert.equal(texto("   ").texto, VAZIO);
  });

  it("célula em branco é diferente de célula sem dado", () => {
    // "—" quer dizer "não preenchido"; numa linha de totais a coluna apenas
    // não se aplica, e o vazio é o certo.
    assert.equal(branco().texto, "");
    assert.notEqual(branco().texto, texto(null).texto);
  });

  it("converte data para o serial do Excel pelos componentes locais", () => {
    assert.equal(serialExcel(em("2020-01-01")), 43831);
    // Meio-dia no fuso de São Paulo é 15:00 UTC; se a conversão usasse UTC, a
    // data de dezembro cairia no dia seguinte.
    assert.equal(serialExcel(em("2026-12-31")), serialExcel(em("2026-12-30")) + 1);
  });

  it("competência mostra mês/ano mas guarda a data", () => {
    const c = competencia(em("2026-09-01"));
    assert.equal(c.texto, "09/2026");
    assert.equal(c.numero, serialExcel(em("2026-09-01")));
  });
});

describe("métricas da fonte do PDF", () => {
  it("mede texto proporcional, não monoespaçado", () => {
    assert.ok(larguraDoTexto("iii", 10) < larguraDoTexto("MMM", 10));
  });

  it("negrito é mais largo que regular", () => {
    assert.ok(larguraDoTexto("Obra", 10, true) > larguraDoTexto("Obra", 10, false));
  });

  it("letra acentuada tem a largura da letra base", () => {
    assert.equal(larguraDoTexto("execucao", 10), larguraDoTexto("execução", 10));
  });

  it("corta só o que não cabe", () => {
    const curto = "Obra";
    assert.equal(cortarPara(curto, 100, 8), curto);
    const cortado = cortarPara("Reforma da Unidade Centro", 30, 8);
    assert.notEqual(cortado, "Reforma da Unidade Centro");
    assert.ok(cortado.endsWith("…"));
    assert.ok(larguraDoTexto(cortado, 8) <= 30);
  });

  it("codifica acento e travessão em WinAnsi", () => {
    // "ç" é 0xE7 no Latin-1; o travessão está em 0x97, fora do Latin-1.
    assert.equal(paraWinAnsi("ç").charCodeAt(0), 0xe7);
    assert.equal(paraWinAnsi("—").charCodeAt(0), 0x97);
    assert.equal(paraWinAnsi(VAZIO).charCodeAt(0), 0x97);
  });

  it("caractere fora da codificação perde o acento em vez de sumir", () => {
    assert.equal(paraWinAnsi("ā"), "a");
    assert.equal(paraWinAnsi("→"), "?");
  });

  it("escapa parênteses e barra, que são sintaxe do PDF", () => {
    assert.equal(escaparPdf("Obra (Bloco B)"), "Obra \\(Bloco B\\)");
    assert.equal(escaparPdf("a\\b"), "a\\\\b");
  });
});

describe("zip", () => {
  it("calcula o CRC-32 padrão", () => {
    assert.equal(crc32(Buffer.from("123456789")), 0xcbf43926);
  });

  it("monta um arquivo com assinatura local e diretório central", () => {
    const zip = Buffer.from(
      zipar([{ nome: "a.txt", dados: Buffer.from("conteúdo", "utf8") }]),
    );
    assert.equal(zip.readUInt32LE(0), 0x04034b50);
    assert.ok(zip.includes(Buffer.from("a.txt")));
    // Fim do diretório central, 22 bytes finais sem comentário.
    assert.equal(zip.readUInt32LE(zip.length - 22), 0x06054b50);
    assert.equal(zip.readUInt16LE(zip.length - 22 + 10), 1);
  });

  it("gera bytes iguais para o mesmo conteúdo", () => {
    // A data no ZIP é fixa justamente para isso: dois relatórios idênticos não
    // podem diferir por causa do relógio.
    const entradas = [{ nome: "a.txt", dados: Buffer.from("x") }];
    assert.deepEqual(zipar(entradas), zipar(entradas));
  });
});

describe("planilha", () => {
  it("numera colunas até depois de Z", () => {
    assert.equal(letraDaColuna(0), "A");
    assert.equal(letraDaColuna(25), "Z");
    assert.equal(letraDaColuna(26), "AA");
    assert.equal(letraDaColuna(27), "AB");
  });

  it("escapa o que quebraria o XML", () => {
    assert.equal(escaparXml('a & b < c > "d"'), "a &amp; b &lt; c &gt; &quot;d&quot;");
  });

  it("corta e limpa o nome da aba", () => {
    assert.equal(nomeDaAba("Medições/2026"), "Medições 2026");
    assert.ok(nomeDaAba("x".repeat(40)).length <= 31);
  });

  it("traz as partes obrigatórias do formato", () => {
    const xlsx = Buffer.from(gerarXlsx(relatorioDeTeste(2)));
    assert.equal(xlsx.readUInt32LE(0), 0x04034b50);
    for (const parte of [
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/workbook.xml",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/worksheets/sheet1.xml",
    ]) {
      assert.doesNotThrow(() => parteDoZip(xlsx, parte), `falta ${parte}`);
    }
  });

  it("grava valor como número, não como texto", () => {
    // Este é o ponto da exportação em planilha: se o valor virasse string, o
    // cliente não conseguiria somar nem filtrar — seria um PDF em outra roupa.
    const sheet = parteDoZip(
      Buffer.from(gerarXlsx(relatorioDeTeste(1))),
      "xl/worksheets/sheet1.xml",
    );
    assert.match(sheet, /<v>125000\.5<\/v>/);
    assert.match(sheet, /<v>0\.425<\/v>/);
    assert.ok(!sheet.includes("R$"), "o texto formatado não pode ir para a célula");
  });

  it("marcador de vazio vai como texto, sem formato de número", () => {
    // Uma célula com "—" e formato de moeda faz o Excel reclamar do conteúdo.
    const linhaSemValor = [texto("Obra"), dinheiro(null), percentual(null), data(null)];
    const sheet = parteDoZip(
      Buffer.from(
        gerarXlsx({ ...relatorioDeTeste(0), linhas: [linhaSemValor], totais: null }),
      ),
      "xl/worksheets/sheet1.xml",
    );
    for (const ref of ["B7", "C7", "D7"]) {
      assert.match(sheet, new RegExp(`<c r="${ref}" s="0" t="inlineStr">`));
    }
  });

  it("planilha vazia continua sendo um arquivo válido", () => {
    const vazio = { ...relatorioDeTeste(0), totais: null };
    assert.ok(gerarXlsx(vazio).byteLength > 0);
  });
});

describe("paginação do PDF", () => {
  it("cabe em uma página quando são poucas linhas", () => {
    const paginas = paginar(relatorioDeTeste(10));
    assert.equal(paginas.length, 1);
    assert.deepEqual(paginas[0], { de: 0, ate: 10, comTotais: true });
  });

  it("quebra em páginas e cobre todas as linhas sem repetir", () => {
    const r = relatorioDeTeste(200);
    const paginas = paginar(r);
    assert.ok(paginas.length > 1);
    assert.equal(paginas[0].de, 0);
    for (let i = 1; i < paginas.length; i++) {
      assert.equal(paginas[i].de, paginas[i - 1].ate);
    }
    assert.equal(paginas[paginas.length - 1].ate, 200);
  });

  it("a linha de totais aparece exatamente uma vez", () => {
    for (const n of [0, 1, 43, 200]) {
      const paginas = paginar(relatorioDeTeste(n));
      assert.equal(paginas.filter((p) => p.comTotais).length, 1, `com ${n} linhas`);
    }
  });

  it("relatório sem totais não inventa página extra", () => {
    const paginas = paginar({ ...relatorioDeTeste(0), totais: null });
    assert.equal(paginas.length, 1);
    assert.equal(paginas[0].comTotais, false);
  });

  it("distribui a largura pelos pesos", () => {
    const larguras = larguraDasColunas(
      [
        { chave: "a", rotulo: "A", peso: 3 },
        { chave: "b", rotulo: "B" },
      ],
      400,
    );
    assert.deepEqual(larguras, [300, 100]);
  });
});

describe("PDF gerado", () => {
  it("tem cabeçalho, xref e marca de fim", () => {
    const pdf = Buffer.from(gerarPdf(relatorioDeTeste(5)));
    assert.equal(pdf.subarray(0, 8).toString("latin1"), "%PDF-1.4");
    assert.ok(pdf.includes(Buffer.from("/Type /Catalog")));
    assert.ok(pdf.includes(Buffer.from("startxref")));
    assert.ok(pdf.subarray(-7).toString("latin1").includes("%%EOF"));
  });

  it("o startxref aponta para o início da tabela xref", () => {
    // Um deslocamento errado aqui é o defeito clássico de PDF escrito à mão: o
    // arquivo abre em alguns leitores e falha em outros.
    const pdf = Buffer.from(gerarPdf(relatorioDeTeste(60)));
    const texto = pdf.toString("latin1");
    const posicao = Number(texto.slice(texto.lastIndexOf("startxref") + 9).trim().split("\n")[0]);
    assert.equal(texto.slice(posicao, posicao + 4), "xref");
  });

  it("conta as páginas no objeto Pages", () => {
    const r = relatorioDeTeste(200);
    const esperado = paginar(r).length;
    const texto = Buffer.from(gerarPdf(r)).toString("latin1");
    assert.ok(texto.includes(`/Count ${esperado}`));
    assert.equal(texto.match(/\/Type \/Page[^s]/g)?.length, esperado);
  });

  it("relatório vazio gera uma página com o aviso", () => {
    const pdf = Buffer.from(gerarPdf({ ...relatorioDeTeste(0), totais: null }));
    assert.ok(pdf.includes(Buffer.from("/Count 1")));
    assert.ok(pdf.includes(Buffer.from("Nenhum registro encontrado")));
  });
});

describe("exportação", () => {
  it("cai no Excel quando o formato pedido não existe", () => {
    assert.equal(lerFormato("pdf"), "pdf");
    assert.equal(lerFormato("xlsx"), "xlsx");
    assert.equal(lerFormato("docx"), "xlsx");
    assert.equal(lerFormato(null), "xlsx");
  });

  it("apelida o título sem acento nem espaço", () => {
    assert.equal(apelido("Obras em execução"), "obras-em-execucao");
    assert.equal(apelido("  Medições / 2026  "), "medicoes-2026");
    assert.equal(apelido("???"), "relatorio");
  });

  it("nomeia o arquivo com a data de geração", () => {
    const r = relatorioDeTeste(1);
    assert.equal(nomeDoArquivo(r, "pdf"), "obras-em-execucao-2026-09-07.pdf");
    assert.equal(nomeDoArquivo(r, "xlsx"), "obras-em-execucao-2026-09-07.xlsx");
  });

  it("entrega corpo e mime coerentes com o formato", () => {
    const pdf = exportar(relatorioDeTeste(3), "pdf");
    assert.equal(pdf.mimeType, "application/pdf");
    assert.equal(Buffer.from(pdf.corpo).subarray(0, 5).toString("latin1"), "%PDF-");

    const xlsx = exportar(relatorioDeTeste(3), "xlsx");
    assert.match(xlsx.mimeType, /spreadsheetml\.sheet$/);
    assert.equal(Buffer.from(xlsx.corpo).readUInt32LE(0), 0x04034b50);
  });
});
