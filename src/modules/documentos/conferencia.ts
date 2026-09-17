import type { TipoDocumento } from "@/generated/prisma/enums";

import { TIPOS_POR_CONTEXTO, tiposOrdenados } from "./rotulos";

/**
 * Lista de conferência de documentos (requisitos.md 1.6).
 *
 * A aba deixou de listar só o que foi enviado: ela lista o que se **espera**,
 * e marca em vermelho o que falta. Pedido do Junior em 17/09/2026, pela
 * Fernanda: *"listando eles e ficar em vermelho o que não foi anexado"*,
 * *"com a inclusão do documento dá pra saber por qual processo já passou e o
 * que falta"*.
 *
 * É esta lista que substitui a aba de Tramitação, removida no mesmo dia. Vale
 * saber o que ela consegue dizer e o que não consegue: ela responde "falta
 * anexar o aceite", não "o processo está há 12 dias na Controladoria". A data
 * exibida é a do upload, que não é a data do fato — o aceite assinado em
 * março e anexado em junho aparece como junho.
 */

/** Situação de um tipo na lista. */
export type SituacaoConferencia = "ANEXADO" | "FALTANDO" | "DISPENSADO";

export type LinhaConferencia = {
  tipo: TipoDocumento;
  situacao: SituacaoConferencia;
  /** Quantos arquivos vivos existem deste tipo. */
  quantidade: number;
  /** Data do anexo mais recente deste tipo. `null` quando não há nenhum. */
  ultimoEnvio: Date | null;
  /** Motivo da dispensa, quando houver. */
  motivo: string | null;
  /**
   * O tipo está fora da lista de esperados — foi anexado mesmo assim.
   *
   * Existe para o "Outro" e para o que o operador anexar por conta própria:
   * a lista de esperados é curta, o acervo não precisa caber nela, e arquivo
   * que não aparece em lista nenhuma é arquivo que ninguém encontra.
   */
  foraDaLista: boolean;
};

/**
 * Os tipos esperados em cada contexto.
 *
 * **Obra:** a lista inteira do seletor, na ordem em que ele já aparece na tela
 * — que é a ordem do processo (edital, proposta, contrato, garantia, ordem de
 * início…). Foi o que o cliente apontou na conversa, com a tela aberta.
 *
 * **Medição:** só os cinco que já eram sugeridos no upload da medição. A
 * Fernanda pediu *"listada em cada medição os documentos necessários"* sem
 * dizer quais — estes cinco são a leitura do mockup, e estão registrados como
 * suposição a confirmar em docs/pontos-para-reuniao.md.
 */
export const ESPERADOS_DA_OBRA: TipoDocumento[] = tiposOrdenados("obra");
export const ESPERADOS_DA_MEDICAO: TipoDocumento[] = [
  ...TIPOS_POR_CONTEXTO.medicao,
];

type DocumentoParaConferencia = {
  tipo: TipoDocumento;
  criadoEm: Date;
};

type DispensaParaConferencia = {
  tipo: TipoDocumento;
  motivo: string | null;
};

/**
 * Monta a lista da tela.
 *
 * A ordem é a regra de leitura pedida: primeiro os esperados, na ordem do
 * processo, faltando e anexados misturados — quem lê de cima para baixo vê
 * onde o processo parou. Depois o que foi anexado fora da lista. Por último,
 * em cinza, o que foi dispensado: *"esse documento fica cinza e é movido para
 * o final da lista"*.
 *
 * Dispensa vence anexo: um tipo marcado "não se aplica" que tenha arquivo
 * anexado continua contando o arquivo, mas some do bloco de cobrança. É o
 * caso de quem dispensou e depois anexou assim mesmo, e a cobrança já não faz
 * sentido.
 */
export function conferenciaDeDocumentos({
  esperados,
  documentos,
  dispensados,
}: {
  esperados: TipoDocumento[];
  documentos: DocumentoParaConferencia[];
  dispensados: DispensaParaConferencia[];
}): LinhaConferencia[] {
  const porTipo = new Map<TipoDocumento, DocumentoParaConferencia[]>();
  for (const d of documentos) {
    const lista = porTipo.get(d.tipo);
    if (lista) lista.push(d);
    else porTipo.set(d.tipo, [d]);
  }

  const motivoPorTipo = new Map<TipoDocumento, string | null>(
    dispensados.map((d) => [d.tipo, d.motivo]),
  );

  const esperado = new Set(esperados);
  // Tipos que não estão na lista mas têm arquivo: entram no fim, na ordem em
  // que o vocabulário os declara, para a tela não mudar de ordem sozinha.
  const extras = tiposOrdenados("obra").filter(
    (t) => !esperado.has(t) && (porTipo.get(t)?.length ?? 0) > 0,
  );

  const linha = (tipo: TipoDocumento, foraDaLista: boolean): LinhaConferencia => {
    const arquivos = porTipo.get(tipo) ?? [];
    const dispensado = motivoPorTipo.has(tipo);
    return {
      tipo,
      situacao: dispensado
        ? "DISPENSADO"
        : arquivos.length > 0
          ? "ANEXADO"
          : "FALTANDO",
      quantidade: arquivos.length,
      ultimoEnvio: arquivos.reduce<Date | null>(
        (maior, a) => (maior === null || a.criadoEm > maior ? a.criadoEm : maior),
        null,
      ),
      motivo: dispensado ? (motivoPorTipo.get(tipo) ?? null) : null,
      foraDaLista,
    };
  };

  const todas = [
    ...esperados.map((t) => linha(t, false)),
    ...extras.map((t) => linha(t, true)),
  ];

  return [
    ...todas.filter((l) => l.situacao !== "DISPENSADO"),
    ...todas.filter((l) => l.situacao === "DISPENSADO"),
  ];
}

export type ResumoConferencia = {
  anexados: number;
  faltando: number;
  dispensados: number;
  /** Quantos tipos ainda são cobrados — anexados mais faltando. */
  cobrados: number;
};

/** Os números do cabeçalho da aba. */
export function resumoDaConferencia(
  linhas: LinhaConferencia[],
): ResumoConferencia {
  const cobradas = linhas.filter((l) => !l.foraDaLista);
  const anexados = cobradas.filter((l) => l.situacao === "ANEXADO").length;
  const faltando = cobradas.filter((l) => l.situacao === "FALTANDO").length;
  return {
    anexados,
    faltando,
    dispensados: cobradas.filter((l) => l.situacao === "DISPENSADO").length,
    cobrados: anexados + faltando,
  };
}
