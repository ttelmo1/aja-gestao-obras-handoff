import { TipoDocumento } from "@/generated/prisma/enums";

/**
 * Nomes dos tipos de documento como o cliente os escreve — é o vocabulário do
 * setor público, não o nosso.
 *
 * A ordem é a da lista que a Fernanda mandou em 21/09/2026: os dezessete do
 * contrato primeiro, na ordem em que o processo acontece, depois os da
 * medição e por fim o vocabulário das outras telas. É esta ordem que o
 * seletor de tipo e a lista de conferência seguem.
 */
export const ROTULOS_TIPO_DOCUMENTO: Record<TipoDocumento, string> = {
  TERMO_ADJUDICACAO: "Termo de adjudicação",
  TERMO_HOMOLOGACAO: "Termo de homologação",
  EMPENHO: "Empenho",
  CONTRATO: "Contrato",
  // Pedido do Junior pela Fernanda em 09/10/2026 — "Planilha Orçamentária,
  // precisa ter", documento obrigatório. Vem junto do contrato.
  PLANILHA_ORCAMENTARIA: "Planilha orçamentária",
  PUBLICACAO_EXTRATO_CONTRATO: "Publicação do extrato de contrato",
  APOLICE_SEGURO: "Apólice de seguro / Risco engenharia",
  PUBLICACAO_COMISSAO_FISCALIZACAO: "Publicação de comissão de fiscalização",
  ORDEM_INICIO: "Ordem de início",
  ART_RRT: "Emissão de ART / RRT",
  CNO: "Emissão da CNO",
  // Era "Medições contratuais" enquanto a linha estava na lista do contrato.
  // Saiu dela em 24/09/2026 e o tipo ficou só na medição — "pode deixar só
  // 'Medições'", nas palavras da Fernanda. A confirmar: ponto #26.
  MEDICAO: "Medições",
  TERMO_ADITIVO: "Termo aditivo",
  APOSTILAMENTO: "Apostilamento",
  RECEBIMENTO_PROVISORIO: "Termo de recebimento provisório",
  RECEBIMENTO_DEFINITIVO: "Termo de recebimento definitivo",
  LICENCA: "Licenças",
  OUTRO: "Outros",

  MEMORIA_CALCULO: "Memória de cálculo",
  CRONOGRAMA: "Cronograma",
  RELATORIO_FOTOGRAFICO: "Relatório fotográfico",
  DIARIO_OBRA: "Diário de obra",
  NOTA_FISCAL: "Nota fiscal",

  PROTOCOLO: "Processo / protocolo",
  ISS: "ISS",
  DESPACHO: "Despacho",
  PARECER: "Parecer",
  AUTORIZACAO: "Autorização / liberação",
  EXIGENCIA: "Exigência / pendência",
  COMPROVANTE: "Comprovante",
  ATESTADO: "Atestado / CAT",
  EDITAL: "Edital",
  PROPOSTA: "Proposta",
  FOTO: "Foto",
  PLANILHA: "Planilha",
};

export const TIPOS_DOCUMENTO = Object.keys(
  ROTULOS_TIPO_DOCUMENTO,
) as TipoDocumento[];

/**
 * Tipos sugeridos por contexto de upload.
 *
 * A lista completa continua disponível em toda tela — isto só reordena, para
 * o tipo provável cair primeiro. Quem envia a nota fiscal da medição não
 * deveria ter que rolar trinta opções até achar "Nota fiscal".
 */
export const TIPOS_POR_CONTEXTO: Record<
  "obra" | "medicao" | "etapa" | "rerratificacao",
  TipoDocumento[]
> = {
  // A lista de documentos do contrato, dita pelo cliente em 21/09/2026 e
  // nesta ordem — sem "Medições contratuais", que saiu em 24/09/2026 porque
  // documento de medição fica só na medição. A planilha orçamentária entrou
  // depois do contrato em 09/10/2026. `OUTRO` fecha a lista: é a linha por onde entra o que não
  // tem tipo próprio, e a única que se repete sem limite.
  obra: [
    TipoDocumento.TERMO_ADJUDICACAO,
    TipoDocumento.TERMO_HOMOLOGACAO,
    TipoDocumento.EMPENHO,
    TipoDocumento.CONTRATO,
    TipoDocumento.PLANILHA_ORCAMENTARIA,
    TipoDocumento.PUBLICACAO_EXTRATO_CONTRATO,
    TipoDocumento.APOLICE_SEGURO,
    TipoDocumento.PUBLICACAO_COMISSAO_FISCALIZACAO,
    TipoDocumento.ORDEM_INICIO,
    TipoDocumento.ART_RRT,
    TipoDocumento.CNO,
    TipoDocumento.TERMO_ADITIVO,
    TipoDocumento.APOSTILAMENTO,
    TipoDocumento.RECEBIMENTO_PROVISORIO,
    TipoDocumento.RECEBIMENTO_DEFINITIVO,
    TipoDocumento.LICENCA,
    TipoDocumento.OUTRO,
  ],
  // Os documentos necessários de uma medição, ditos pelo cliente em
  // 17/09/2026 e nesta ordem.
  medicao: [
    TipoDocumento.MEDICAO,
    TipoDocumento.MEMORIA_CALCULO,
    TipoDocumento.CRONOGRAMA,
    TipoDocumento.RELATORIO_FOTOGRAFICO,
    TipoDocumento.DIARIO_OBRA,
    TipoDocumento.NOTA_FISCAL,
    TipoDocumento.OUTRO,
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
    TipoDocumento.TERMO_ADITIVO,
    TipoDocumento.APOSTILAMENTO,
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
