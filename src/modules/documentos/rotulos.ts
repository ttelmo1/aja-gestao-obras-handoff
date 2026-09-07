import { TipoDocumento } from "@/generated/prisma/enums";

/**
 * Nomes dos tipos de documento como o cliente os escreve no mockup — é o
 * vocabulário do setor público, não o nosso. "Atestado / CAT" e
 * "Autorização / liberação" carregam os dois termos de propósito: o mockup
 * usa ora um, ora outro, e quem procura por um precisa achar pelo outro.
 */
export const ROTULOS_TIPO_DOCUMENTO: Record<TipoDocumento, string> = {
  EDITAL: "Edital",
  PROPOSTA: "Proposta",
  CONTRATO: "Contrato",
  GARANTIA: "Garantia",
  ORDEM_INICIO: "Ordem de início",
  PROTOCOLO: "Processo / protocolo",
  MEDICAO: "Medição",
  NOTA_FISCAL: "Nota fiscal",
  ISS: "ISS",
  DESPACHO: "Despacho",
  PARECER: "Parecer",
  AUTORIZACAO: "Autorização / liberação",
  EXIGENCIA: "Exigência / pendência",
  COMPROVANTE: "Comprovante",
  RERRATIFICACAO: "Rerratificação",
  ACEITE: "Aceite",
  ATESTADO: "Atestado / CAT",
  FOTO: "Foto",
  PLANILHA: "Planilha",
  OUTRO: "Outro",
};

export const TIPOS_DOCUMENTO = Object.keys(
  ROTULOS_TIPO_DOCUMENTO,
) as TipoDocumento[];

/**
 * Tipos sugeridos por contexto de upload.
 *
 * A lista completa continua disponível em toda tela — isto só reordena, para
 * o tipo provável cair primeiro. Quem envia a nota fiscal da medição não
 * deveria ter que rolar vinte opções até achar "Nota fiscal".
 */
export const TIPOS_POR_CONTEXTO: Record<
  "obra" | "medicao" | "etapa" | "rerratificacao",
  TipoDocumento[]
> = {
  obra: [
    TipoDocumento.CONTRATO,
    TipoDocumento.EDITAL,
    TipoDocumento.PROPOSTA,
    TipoDocumento.GARANTIA,
    TipoDocumento.ORDEM_INICIO,
    TipoDocumento.ACEITE,
    TipoDocumento.ATESTADO,
    TipoDocumento.FOTO,
  ],
  medicao: [
    TipoDocumento.MEDICAO,
    TipoDocumento.PROTOCOLO,
    TipoDocumento.NOTA_FISCAL,
    TipoDocumento.ISS,
    TipoDocumento.PLANILHA,
  ],
  // A lista do seletor "TIPO DO DOCUMENTO" da etapa, no mockup.
  etapa: [
    TipoDocumento.DESPACHO,
    TipoDocumento.PARECER,
    TipoDocumento.AUTORIZACAO,
    TipoDocumento.EXIGENCIA,
    TipoDocumento.COMPROVANTE,
    TipoDocumento.PROTOCOLO,
  ],
  rerratificacao: [
    TipoDocumento.RERRATIFICACAO,
    TipoDocumento.PLANILHA,
    TipoDocumento.PARECER,
  ],
};

/** Sugeridos primeiro, o resto depois, sem repetir. */
export function tiposOrdenados(
  contexto: keyof typeof TIPOS_POR_CONTEXTO,
): TipoDocumento[] {
  const sugeridos = TIPOS_POR_CONTEXTO[contexto];
  return [...sugeridos, ...TIPOS_DOCUMENTO.filter((t) => !sugeridos.includes(t))];
}

/** Tamanho legível para a tela — o número cru em bytes não diz nada. */
export function formatarTamanho(bytes: bigint | number): string {
  const n = typeof bytes === "bigint" ? Number(bytes) : bytes;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
