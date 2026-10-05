import type { Relatorio } from "./modelo";
import { gerarPdf } from "./pdf";
import { gerarXlsx } from "./xlsx";

/**
 * Ponto único de saída dos relatórios: recebe o modelo e devolve o arquivo
 * pronto para virar `Response`. As rotas não conhecem PDF nem XLSX.
 */

export const FORMATOS = ["xlsx", "pdf"] as const;
export type FormatoRelatorio = (typeof FORMATOS)[number];

export const ROTULOS_FORMATO: Record<FormatoRelatorio, string> = {
  xlsx: "Excel",
  pdf: "PDF",
};

const MIME: Record<FormatoRelatorio, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

export function ehFormato(valor: string | null | undefined): valor is FormatoRelatorio {
  return FORMATOS.includes(valor as FormatoRelatorio);
}

/** Formato pedido na querystring, com XLSX como padrão. */
export function lerFormato(valor: string | null | undefined): FormatoRelatorio {
  return ehFormato(valor) ? valor : "xlsx";
}

/**
 * Título para nome de arquivo: sem acento, sem espaço, minúsculo.
 * O arquivo vai parar no Windows do cliente e pode ser anexado em e-mail —
 * acento e espaço no nome ainda quebram coisas por lá.
 */
export function apelido(titulo: string): string {
  const semAcento = titulo.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return (
    semAcento
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "relatorio"
  );
}

function carimboDeData(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function nomeDoArquivo(relatorio: Relatorio, formato: FormatoRelatorio): string {
  return `${apelido(relatorio.titulo)}-${carimboDeData(relatorio.geradoEm)}.${formato}`;
}

export type ArquivoExportado = {
  corpo: Uint8Array;
  mimeType: string;
  nomeDoArquivo: string;
};

export function exportar(
  relatorio: Relatorio,
  formato: FormatoRelatorio,
): ArquivoExportado {
  const corpo = formato === "pdf" ? gerarPdf(relatorio) : gerarXlsx(relatorio);
  return {
    corpo,
    mimeType: MIME[formato],
    nomeDoArquivo: nomeDoArquivo(relatorio, formato),
  };
}

/**
 * Resposta HTTP do download.
 *
 * `attachment` e não `inline`: relatório é arquivo para guardar e anexar, e o
 * PDF aberto na aba perde o nome que acabamos de montar. `no-store` porque a
 * resposta depende de quem pediu e dos filtros, como no download de documento.
 */
export function respostaDeDownload(arquivo: ArquivoExportado): Response {
  return new Response(new Uint8Array(arquivo.corpo), {
    headers: {
      "Content-Type": arquivo.mimeType,
      "Content-Length": String(arquivo.corpo.byteLength),
      "Content-Disposition": `attachment; filename="${arquivo.nomeDoArquivo}"; filename*=UTF-8''${encodeURIComponent(arquivo.nomeDoArquivo)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
