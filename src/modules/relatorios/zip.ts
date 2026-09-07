import { deflateRawSync } from "node:zlib";

/**
 * Escritor de ZIP mínimo — o suficiente para montar um .xlsx, que é um ZIP com
 * alguns XMLs dentro.
 *
 * Sem dependência de novo: `node:zlib` já faz o deflate, e o resto do formato é
 * cabeçalho local, diretório central e o registro de fim. Não trata pastas,
 * ZIP64 nem senha, porque uma planilha de relatório não precisa de nada disso.
 */

export type EntradaZip = { nome: string; dados: Buffer };

const TABELA_CRC = (() => {
  const tabela = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabela[i] = c >>> 0;
  }
  return tabela;
})();

export function crc32(dados: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < dados.length; i++) {
    c = TABELA_CRC[(c ^ dados[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Data/hora no formato MS-DOS que o ZIP usa. Fixamos 01/01/1980, a data mais
 * antiga representável: o conteúdo do arquivo é que importa, e um carimbo fixo
 * deixa a saída reproduzível — dois relatórios iguais geram bytes iguais.
 */
const DATA_DOS = 0x0021;
const HORA_DOS = 0x0000;

export function zipar(entradas: EntradaZip[]): Uint8Array {
  const locais: Buffer[] = [];
  const central: Buffer[] = [];
  let deslocamento = 0;

  for (const entrada of entradas) {
    const nome = Buffer.from(entrada.nome, "utf8");
    const comprimido = deflateRawSync(entrada.dados);
    const crc = crc32(entrada.dados);

    const cabecalho = Buffer.alloc(30);
    cabecalho.writeUInt32LE(0x04034b50, 0);
    cabecalho.writeUInt16LE(20, 4); // versão necessária
    cabecalho.writeUInt16LE(0x0800, 6); // nome do arquivo em UTF-8
    cabecalho.writeUInt16LE(8, 8); // deflate
    cabecalho.writeUInt16LE(HORA_DOS, 10);
    cabecalho.writeUInt16LE(DATA_DOS, 12);
    cabecalho.writeUInt32LE(crc, 14);
    cabecalho.writeUInt32LE(comprimido.length, 18);
    cabecalho.writeUInt32LE(entrada.dados.length, 22);
    cabecalho.writeUInt16LE(nome.length, 26);
    cabecalho.writeUInt16LE(0, 28);

    locais.push(cabecalho, nome, comprimido);

    const registro = Buffer.alloc(46);
    registro.writeUInt32LE(0x02014b50, 0);
    registro.writeUInt16LE(20, 4); // versão de criação
    registro.writeUInt16LE(20, 6);
    registro.writeUInt16LE(0x0800, 8);
    registro.writeUInt16LE(8, 10);
    registro.writeUInt16LE(HORA_DOS, 12);
    registro.writeUInt16LE(DATA_DOS, 14);
    registro.writeUInt32LE(crc, 16);
    registro.writeUInt32LE(comprimido.length, 20);
    registro.writeUInt32LE(entrada.dados.length, 24);
    registro.writeUInt16LE(nome.length, 28);
    registro.writeUInt32LE(deslocamento, 42);

    central.push(registro, nome);
    deslocamento += cabecalho.length + nome.length + comprimido.length;
  }

  const corpoCentral = Buffer.concat(central);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0);
  fim.writeUInt16LE(entradas.length, 8);
  fim.writeUInt16LE(entradas.length, 10);
  fim.writeUInt32LE(corpoCentral.length, 12);
  fim.writeUInt32LE(deslocamento, 16);

  return new Uint8Array(Buffer.concat([...locais, corpoCentral, fim]));
}
