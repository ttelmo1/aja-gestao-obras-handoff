import { formatarDataHora } from "@/lib/date-br";

import { cortarPara, escaparPdf, larguraDoTexto } from "./fontes";
import {
  alinhaADireita,
  type Coluna,
  type Linha,
  type Relatorio,
} from "./modelo";

/**
 * Gerador de PDF tabular, escrito à mão.
 *
 * Sem biblioteca por dois motivos: o servidor do cliente é offline e não pode
 * depender de nada baixado em runtime, e as bibliotecas de PDF em Node ou
 * embutem arquivos de fonte (megabytes) ou rodam headless browser (um processo
 * a mais para instalar on-premise). Um relatório tabular em Helvetica cabe em
 * um arquivo de PDF 1.4 escrito direto.
 *
 * O que este gerador faz: página A4, cabeçalho com título e filtros aplicados,
 * tabela com cabeçalho repetido a cada página, linha de totais e rodapé com
 * paginação. O que não faz: imagem, gráfico e quebra de linha dentro da célula
 * — texto que não cabe é cortado com reticências.
 */

const A4 = { largura: 595.28, altura: 841.89 };
const MARGEM = 36;

const CORPO = 8;
const ALTURA_LINHA = 15;
const ALTURA_CABECALHO_TABELA = 18;

// Tokens de `globals.css`, convertidos para RGB 0–1.
const NAVY = [0.09, 0.196, 0.302] as const;
const CINZA = [0.435, 0.49, 0.549] as const;
const BORDA = [0.874, 0.902, 0.926] as const;
const ZEBRA = [0.953, 0.965, 0.976] as const;
const OURO = [0.78, 0.604, 0.271] as const;
const PRETO = [0.153, 0.204, 0.267] as const;

type Cor = readonly [number, number, number];

class Tela {
  private partes: string[] = [];

  retangulo(x: number, y: number, largura: number, altura: number, cor: Cor) {
    this.partes.push(
      `${cor[0]} ${cor[1]} ${cor[2]} rg`,
      `${n(x)} ${n(y)} ${n(largura)} ${n(altura)} re f`,
    );
  }

  linhaHorizontal(x: number, y: number, largura: number, cor: Cor, espessura = 0.5) {
    this.partes.push(
      `${cor[0]} ${cor[1]} ${cor[2]} RG`,
      `${n(espessura)} w`,
      `${n(x)} ${n(y)} m ${n(x + largura)} ${n(y)} l S`,
    );
  }

  texto(
    conteudo: string,
    x: number,
    y: number,
    opcoes: { tamanho?: number; negrito?: boolean; cor?: Cor } = {},
  ) {
    if (!conteudo) return;
    const tamanho = opcoes.tamanho ?? CORPO;
    const cor = opcoes.cor ?? PRETO;
    const fonte = opcoes.negrito ? "/F2" : "/F1";
    this.partes.push(
      `${cor[0]} ${cor[1]} ${cor[2]} rg`,
      "BT",
      `${fonte} ${n(tamanho)} Tf`,
      `1 0 0 1 ${n(x)} ${n(y)} Tm`,
      `(${escaparPdf(conteudo)}) Tj`,
      "ET",
    );
  }

  textoADireita(
    conteudo: string,
    direita: number,
    y: number,
    opcoes: { tamanho?: number; negrito?: boolean; cor?: Cor } = {},
  ) {
    const largura = larguraDoTexto(conteudo, opcoes.tamanho ?? CORPO, opcoes.negrito);
    this.texto(conteudo, direita - largura, y, opcoes);
  }

  finalizar(): string {
    return this.partes.join("\n");
  }
}

/** Números do PDF sem notação científica e sem casas inúteis. */
function n(valor: number): string {
  return Number(valor.toFixed(3)).toString();
}

function dimensoes(r: Relatorio) {
  return r.orientacao === "paisagem"
    ? { largura: A4.altura, altura: A4.largura }
    : { largura: A4.largura, altura: A4.altura };
}

/**
 * Larguras das colunas em pontos, distribuídas pelos pesos.
 * Sem peso, todas as colunas valem o mesmo.
 */
export function larguraDasColunas(colunas: Coluna[], disponivel: number): number[] {
  const pesos = colunas.map((c) => (c.peso && c.peso > 0 ? c.peso : 1));
  const total = pesos.reduce((a, b) => a + b, 0);
  return pesos.map((p) => (p / total) * disponivel);
}

function alturaDoCabecalho(r: Relatorio, primeira: boolean): number {
  if (!primeira) return 30;
  let altura = 26; // título
  if (r.subtitulo) altura += 13;
  const filtros = r.filtros?.length ?? 0;
  if (filtros > 0) altura += 12 + Math.ceil(filtros / 3) * 11;
  return altura + 10;
}

type Pagina = { de: number; ate: number; comTotais: boolean };

/**
 * Distribui as linhas entre as páginas.
 *
 * Exportado porque é a única parte do gerador que dá para testar sem ler o
 * arquivo: o resto é sintaxe de PDF.
 */
export function paginar(r: Relatorio, alturaUtilPagina?: number): Pagina[] {
  const { altura } = dimensoes(r);
  const alturaDisponivel = alturaUtilPagina ?? altura - MARGEM * 2 - 22; // 22 = rodapé
  const paginas: Pagina[] = [];
  const totalLinhas = r.linhas.length;
  const temTotais = Boolean(r.totais);

  let indice = 0;
  let primeira = true;

  do {
    const espaco =
      alturaDisponivel - alturaDoCabecalho(r, primeira) - ALTURA_CABECALHO_TABELA;
    const cabem = Math.max(1, Math.floor(espaco / ALTURA_LINHA));
    const ate = Math.min(totalLinhas, indice + cabem);
    const ultimaDeDados = ate >= totalLinhas;
    // A linha de totais só entra se sobrar altura para ela nesta página.
    const totaisAqui = temTotais && ultimaDeDados && ate - indice < cabem;

    paginas.push({ de: indice, ate, comTotais: totaisAqui });
    indice = ate;
    primeira = false;
  } while (indice < totalLinhas);

  if (temTotais && !paginas.some((p) => p.comTotais)) {
    paginas.push({ de: totalLinhas, ate: totalLinhas, comTotais: true });
  }
  return paginas;
}

function desenharPagina(
  r: Relatorio,
  pagina: Pagina,
  numero: number,
  total: number,
): string {
  const { largura, altura } = dimensoes(r);
  const util = largura - MARGEM * 2;
  const tela = new Tela();
  const primeira = numero === 1;

  let y = altura - MARGEM;

  if (primeira) {
    tela.texto(r.titulo, MARGEM, y - 13, { tamanho: 15, negrito: true, cor: NAVY });
    tela.textoADireita(`Gerado em ${formatarDataHora(r.geradoEm)}`, largura - MARGEM, y - 8, {
      tamanho: 7.5,
      cor: CINZA,
    });
    if (r.geradoPor) {
      tela.textoADireita(`por ${r.geradoPor}`, largura - MARGEM, y - 18, {
        tamanho: 7.5,
        cor: CINZA,
      });
    }
    y -= 26;

    if (r.subtitulo) {
      tela.texto(r.subtitulo, MARGEM, y - 9, { tamanho: 9.5, cor: CINZA });
      y -= 13;
    }

    const filtros = r.filtros ?? [];
    if (filtros.length > 0) {
      y -= 6;
      tela.texto("FILTROS APLICADOS", MARGEM, y - 6, {
        tamanho: 6.5,
        negrito: true,
        cor: OURO,
      });
      y -= 12;
      const colunaLargura = util / 3;
      filtros.forEach((f, i) => {
        const linha = Math.floor(i / 3);
        const x = MARGEM + (i % 3) * colunaLargura;
        const texto = cortarPara(`${f.rotulo}: ${f.valor}`, colunaLargura - 8, 7.5);
        tela.texto(texto, x, y - 7 - linha * 11, { tamanho: 7.5, cor: PRETO });
      });
      y -= Math.ceil(filtros.length / 3) * 11;
    }
    y -= 10;
  } else {
    tela.texto(r.titulo, MARGEM, y - 10, { tamanho: 10, negrito: true, cor: NAVY });
    tela.textoADireita(`Página ${numero} de ${total}`, largura - MARGEM, y - 10, {
      tamanho: 7.5,
      cor: CINZA,
    });
    y -= 30;
  }

  const larguras = larguraDasColunas(r.colunas, util);

  // Cabeçalho da tabela.
  tela.retangulo(MARGEM, y - ALTURA_CABECALHO_TABELA, util, ALTURA_CABECALHO_TABELA, NAVY);
  let x = MARGEM;
  r.colunas.forEach((coluna, i) => {
    const w = larguras[i];
    const rotulo = cortarPara(coluna.rotulo, w - 10, 7.5, true);
    const yTexto = y - ALTURA_CABECALHO_TABELA + 6;
    if (alinhaADireita(coluna)) {
      tela.textoADireita(rotulo, x + w - 5, yTexto, {
        tamanho: 7.5,
        negrito: true,
        cor: [1, 1, 1],
      });
    } else {
      tela.texto(rotulo, x + 5, yTexto, { tamanho: 7.5, negrito: true, cor: [1, 1, 1] });
    }
    x += w;
  });
  y -= ALTURA_CABECALHO_TABELA;

  const desenharLinha = (linha: Linha, indice: number, destaque: boolean) => {
    const topo = y;
    const base = y - ALTURA_LINHA;
    if (destaque) {
      tela.retangulo(MARGEM, base, util, ALTURA_LINHA, [0.937, 0.953, 0.969]);
    } else if (indice % 2 === 1) {
      tela.retangulo(MARGEM, base, util, ALTURA_LINHA, ZEBRA);
    }
    let cx = MARGEM;
    r.colunas.forEach((coluna, i) => {
      const w = larguras[i];
      const celula = linha[i];
      const bruto = celula?.texto ?? "";
      const conteudo = cortarPara(bruto, w - 10, CORPO, destaque);
      const yTexto = base + 5;
      if (alinhaADireita(coluna)) {
        tela.textoADireita(conteudo, cx + w - 5, yTexto, {
          tamanho: CORPO,
          negrito: destaque,
        });
      } else {
        tela.texto(conteudo, cx + 5, yTexto, { tamanho: CORPO, negrito: destaque });
      }
      cx += w;
    });
    tela.linhaHorizontal(MARGEM, base, util, BORDA, 0.4);
    y = base;
    return topo;
  };

  for (let i = pagina.de; i < pagina.ate; i++) {
    desenharLinha(r.linhas[i], i - pagina.de, false);
  }

  if (pagina.comTotais && r.totais) {
    tela.linhaHorizontal(MARGEM, y, util, NAVY, 0.8);
    desenharLinha(r.totais, 0, true);
  }

  if (pagina.ate === pagina.de && !pagina.comTotais && r.linhas.length === 0) {
    tela.texto("Nenhum registro encontrado para os filtros aplicados.", MARGEM + 5, y - 12, {
      tamanho: 8.5,
      cor: CINZA,
    });
    y -= ALTURA_LINHA;
  }

  if (r.observacao && numero === total) {
    tela.texto(r.observacao, MARGEM, y - 14, { tamanho: 7, cor: CINZA });
  }

  // Rodapé.
  const yRodape = MARGEM + 14;
  tela.linhaHorizontal(MARGEM, yRodape, util, BORDA, 0.4);
  tela.texto("AJA Grupo Empresarial — Sistema de Gestão de Obras", MARGEM, yRodape - 9, {
    tamanho: 7,
    cor: CINZA,
  });
  tela.textoADireita(`Página ${numero} de ${total}`, largura - MARGEM, yRodape - 9, {
    tamanho: 7,
    cor: CINZA,
  });

  return tela.finalizar();
}

export function gerarPdf(relatorio: Relatorio): Uint8Array {
  const { largura, altura } = dimensoes(relatorio);
  const paginas = paginar(relatorio);
  const conteudos = paginas.map((p, i) =>
    desenharPagina(relatorio, p, i + 1, paginas.length),
  );

  const objetos: Buffer[] = [];
  const adicionar = (corpo: string | Buffer) => {
    objetos.push(Buffer.isBuffer(corpo) ? corpo : Buffer.from(corpo, "latin1"));
    return objetos.length; // número do objeto (1-based)
  };

  // Reserva 1 (catálogo) e 2 (páginas); os ids das páginas só existem depois.
  adicionar("");
  adicionar("");
  const fonteRegular = adicionar(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  );
  const fonteNegrito = adicionar(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  );

  const idsDasPaginas: number[] = [];
  for (const conteudo of conteudos) {
    const fluxo = Buffer.from(conteudo, "latin1");
    const idConteudo = adicionar(
      Buffer.concat([
        Buffer.from(`<< /Length ${fluxo.length} >>\nstream\n`, "latin1"),
        fluxo,
        Buffer.from("\nendstream", "latin1"),
      ]),
    );
    const idPagina = adicionar(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(largura)} ${n(altura)}] ` +
        `/Resources << /Font << /F1 ${fonteRegular} 0 R /F2 ${fonteNegrito} 0 R >> >> ` +
        `/Contents ${idConteudo} 0 R >>`,
    );
    idsDasPaginas.push(idPagina);
  }

  objetos[0] = Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "latin1");
  objetos[1] = Buffer.from(
    `<< /Type /Pages /Kids [${idsDasPaginas.map((id) => `${id} 0 R`).join(" ")}] ` +
      `/Count ${idsDasPaginas.length} >>`,
    "latin1",
  );

  const partes: Buffer[] = [Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "latin1")];
  let deslocamento = partes[0].length;
  const posicoes: number[] = [];

  objetos.forEach((corpo, i) => {
    posicoes.push(deslocamento);
    const bloco = Buffer.concat([
      Buffer.from(`${i + 1} 0 obj\n`, "latin1"),
      corpo,
      Buffer.from("\nendobj\n", "latin1"),
    ]);
    partes.push(bloco);
    deslocamento += bloco.length;
  });

  const inicioXref = deslocamento;
  const xref = [
    `xref\n0 ${objetos.length + 1}\n`,
    "0000000000 65535 f \n",
    ...posicoes.map((p) => `${String(p).padStart(10, "0")} 00000 n \n`),
    `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`,
  ].join("");
  partes.push(Buffer.from(xref, "latin1"));

  return new Uint8Array(Buffer.concat(partes));
}
