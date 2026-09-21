import { TipoDocumento } from "@/generated/prisma/enums";

import type { VinculosDoDocumento } from "./origem";
import { TIPOS_DOCUMENTO, TIPOS_POR_CONTEXTO } from "./rotulos";

/**
 * A lista de documentos de uma tela, em uma tabela só.
 *
 * Até 17/09/2026 as telas tinham três blocos — o que se **espera** ("Conferência
 * do contrato", "Documentos necessários"), o que **existe** ("Documentos",
 * "Arquivos da medição") e um formulário de envio no fim da página, solto de
 * qualquer linha. Quem olhava lia a mesma informação em dois lugares e enviava
 * arquivo num terceiro, escolhendo o tipo de novo num seletor. Este módulo
 * junta os três: cada linha é um tipo esperado, que ou já tem arquivo, ou está
 * em falta com o botão de incluir, ou foi marcado como "não se aplica".
 *
 * As duas telas que usam isto têm regras diferentes de repetição, e é a
 * diferença que justifica o parâmetro:
 *
 * - **Contrato:** cada tipo entra uma vez. Precisando de um segundo arquivo do
 *   mesmo assunto, ele vai como "Outros" — que, com as medições, é o que
 *   aceita repetição ali.
 * - **Medição:** todo tipo se repete. A mesma medição pode ter duas planilhas
 *   de memória de cálculo, e cobrar "uma nota fiscal por medição" seria
 *   inventar uma regra que o cliente não pediu.
 */

/**
 * Tipos que podem se repetir no contrato.
 *
 * "Outros" é a porta do que não tem tipo próprio. "Medições contratuais" se
 * repete porque um contrato tem várias: a linha da lista é o assunto, e cada
 * boletim anexado nas medições aparece nela.
 */
const ACEITAM_REPETICAO = new Set<TipoDocumento>([
  TipoDocumento.OUTRO,
  TipoDocumento.MEDICAO,
]);

export function aceitaMaisDeUm(tipo: TipoDocumento): boolean {
  return ACEITAM_REPETICAO.has(tipo);
}

/**
 * Tipos que têm linha na lista mas não são cobrados: não contam no "N de M
 * não anexado(s)", não ficam vermelhos e não oferecem "não se aplica".
 *
 * - **Outros** é a porta de entrada do que não tem tipo próprio — cobrá-lo
 *   deixaria toda obra com uma pendência que nunca fecha.
 * - **Termo aditivo** e **apostilamento** vieram do cliente com a ressalva
 *   "(em caso de necessidade)": contrato que não precisou de aditivo não está
 *   em falta com nada, e cobrar os dois abriria duas linhas vermelhas eternas
 *   na maioria das obras.
 */
const OPCIONAIS = new Set<TipoDocumento>([
  TipoDocumento.OUTRO,
  TipoDocumento.TERMO_ADITIVO,
  TipoDocumento.APOSTILAMENTO,
]);

export function ehOpcional(tipo: TipoDocumento): boolean {
  return OPCIONAIS.has(tipo);
}

/**
 * O documento pertence ao contrato — e não a uma medição, a um movimento de
 * tramitação ou a uma rerratificação, que têm tela própria para anexar.
 */
export function ehDoContrato(d: VinculosDoDocumento): boolean {
  return !d.medicao && !d.movimento && !d.rerratificacao;
}

/**
 * Tipos cuja linha do contrato é cumprida pelo arquivo de outra tela.
 *
 * Hoje é só "Medições contratuais", item 11 da lista do cliente. Os boletins
 * são anexados na tela de cada medição — se a linha do contrato só olhasse os
 * arquivos do próprio contrato, ela ficaria vermelha para sempre numa obra
 * que tem todas as medições em dia.
 */
const CUMPREM_DE_OUTRA_TELA = new Set<TipoDocumento>([TipoDocumento.MEDICAO]);

export function cobradoNoContrato(
  d: VinculosDoDocumento & { tipo: TipoDocumento },
): boolean {
  return ehDoContrato(d) || CUMPREM_DE_OUTRA_TELA.has(d.tipo);
}

/**
 * Os tipos esperados em cada contexto.
 *
 * **Obra:** a lista de dezessete documentos que a Fernanda mandou em
 * 21/09/2026, na ordem em que ela veio — que é a ordem do processo: termo de
 * adjudicação, homologação, empenho, contrato, publicação do extrato… até
 * recebimento definitivo e licenças, com "Outros" fechando.
 *
 * **Medição:** os seis que o cliente nomeou em 17/09/2026 — medição, memória
 * de cálculo, cronograma, relatório fotográfico, diário de obra e nota fiscal
 * — mais a linha "Outros".
 *
 * Tipo fora das duas listas (edital, proposta, atestado, despacho…) continua
 * existindo no vocabulário e anexável onde faz sentido; no contrato ele
 * aparece como "fora da lista" se alguém o usar, sem ser cobrado.
 */
export const ESPERADOS_DA_OBRA: TipoDocumento[] = [...TIPOS_POR_CONTEXTO.obra];
export const ESPERADOS_DA_MEDICAO: TipoDocumento[] = [
  ...TIPOS_POR_CONTEXTO.medicao,
];

export type SituacaoLinha = "ANEXADO" | "FALTANDO" | "DISPENSADO";

/**
 * De onde a linha veio:
 *
 * - `ESPERADO` — o tipo está na lista que esta tela cobra. São estas que
 *   contam no cabeçalho.
 * - `EXTRA` — o arquivo é desta tela, mas de um tipo fora da lista cobrada. A
 *   lista de esperados é curta de propósito, e arquivo que não aparece em
 *   lista nenhuma é arquivo que ninguém encontra.
 * - `OUTRA_TELA` — o arquivo é de uma medição, de uma rerratificação ou da
 *   tramitação, visto de fora. Aparece para dar o acervo inteiro da obra, sem
 *   botão de incluir: quem anexa é a tela de origem.
 */
export type ClasseLinha = "ESPERADO" | "EXTRA" | "OUTRA_TELA";

export type LinhaAcervo<D> = {
  /** Chave de React: id do documento, ou o tipo quando a linha está vazia. */
  chave: string;
  tipo: TipoDocumento;
  situacao: SituacaoLinha;
  /** O arquivo, quando a linha tem um. */
  documento: D | null;
  /** Motivo da dispensa, quando houver. */
  motivo: string | null;
  classe: ClasseLinha;
  /** A linha oferece o botão "Incluir". */
  aceitaInclusao: boolean;
};

type DocumentoDoAcervo = VinculosDoDocumento & {
  id: string;
  tipo: TipoDocumento;
  criadoEm: Date;
};

type DispensaDoAcervo = {
  tipo: TipoDocumento;
  motivo: string | null;
};

type Entrada<D> = {
  esperados: TipoDocumento[];
  documentos: D[];
  dispensados: DispensaDoAcervo[];
  /** O documento é desta tela? O que não for vira linha `OUTRA_TELA`. */
  pertence?: (d: D) => boolean;
  /** O tipo aceita mais de um arquivo nesta tela? */
  permiteRepeticao?: (tipo: TipoDocumento) => boolean;
};

/**
 * Monta a lista da tela.
 *
 * A ordem é a de leitura do processo: os tipos esperados na ordem em que
 * acontecem (adjudicação, homologação, empenho, contrato…), faltando
 * e anexados misturados, para quem lê de cima para baixo ver onde o processo
 * parou. Depois o que é desta tela mas está fora da lista, e o que veio de
 * outras telas. Por último, em cinza, o que foi marcado como "não se aplica".
 *
 * Dispensa vence anexo: o tipo marcado "não se aplica" que tenha arquivo
 * continua mostrando o arquivo, mas na parte cinza do fim — quem dispensou e
 * anexou assim mesmo não precisa mais ser cobrado.
 */
export function montarAcervo<D extends DocumentoDoAcervo>({
  esperados,
  documentos,
  dispensados,
  pertence = () => true,
  permiteRepeticao = aceitaMaisDeUm,
}: Entrada<D>): Array<LinhaAcervo<D>> {
  const motivoPorTipo = new Map<TipoDocumento, string | null>(
    dispensados.map((d) => [d.tipo, d.motivo]),
  );

  const daTela = documentos.filter(pertence);
  const deOutrasTelas = documentos.filter((d) => !pertence(d));

  const porTipo = new Map<TipoDocumento, D[]>();
  for (const d of daTela) {
    const lista = porTipo.get(d.tipo);
    if (lista) lista.push(d);
    else porTipo.set(d.tipo, [d]);
  }
  // Mais antigo primeiro: quando um tipo acumula arquivos, a ordem do processo
  // é a de envio.
  for (const lista of porTipo.values()) {
    lista.sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime());
  }

  const cobradas: Array<LinhaAcervo<D>> = [];
  const dispensadas: Array<LinhaAcervo<D>> = [];

  const distribuir = (tipo: TipoDocumento, classe: ClasseLinha) => {
    const dispensado = motivoPorTipo.has(tipo);
    const destino = dispensado ? dispensadas : cobradas;
    const arquivos = porTipo.get(tipo) ?? [];
    const motivo = dispensado ? (motivoPorTipo.get(tipo) ?? null) : null;

    for (const documento of arquivos) {
      destino.push({
        chave: documento.id,
        tipo,
        situacao: dispensado ? "DISPENSADO" : "ANEXADO",
        documento,
        motivo,
        classe,
        // Um tipo que aceita repetição nunca fecha a porta: cada arquivo já
        // enviado continua oferecendo "Incluir" para o próximo.
        aceitaInclusao: !dispensado && permiteRepeticao(tipo),
      });
    }

    // A linha vazia só aparece quando não há nenhum arquivo: onde o tipo se
    // repete, o convite para incluir já está na última linha preenchida.
    if (arquivos.length === 0) {
      destino.push({
        chave: tipo,
        tipo,
        situacao: dispensado ? "DISPENSADO" : "FALTANDO",
        documento: null,
        motivo,
        classe,
        aceitaInclusao: !dispensado,
      });
    }
  };

  for (const tipo of esperados) distribuir(tipo, "ESPERADO");

  // Tipos que esta tela não cobra mas têm arquivo: entram depois, na ordem em
  // que o vocabulário os declara, para a tela não mudar de ordem sozinha.
  const esperado = new Set(esperados);
  for (const tipo of TIPOS_DOCUMENTO) {
    if (esperado.has(tipo)) continue;
    if ((porTipo.get(tipo)?.length ?? 0) === 0) continue;
    distribuir(tipo, "EXTRA");
  }

  const outras = deOutrasTelas
    .slice()
    .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime())
    .map<LinhaAcervo<D>>((documento) => ({
      chave: documento.id,
      tipo: documento.tipo,
      situacao: "ANEXADO",
      documento,
      motivo: null,
      classe: "OUTRA_TELA",
      aceitaInclusao: false,
    }));

  return [...cobradas, ...outras, ...dispensadas];
}

/**
 * A aba Documentos da obra: um arquivo por tipo — menos "Outros" e as
 * medições —, e o que estiver preso a outra tela entra como linha de leitura.
 */
export function acervoDoContrato<D extends DocumentoDoAcervo>(
  entrada: Omit<Entrada<D>, "pertence" | "permiteRepeticao">,
): Array<LinhaAcervo<D>> {
  return montarAcervo({
    ...entrada,
    pertence: cobradoNoContrato,
    permiteRepeticao: aceitaMaisDeUm,
  });
}

/**
 * A tela da medição: recebe já só os documentos dela, e todo tipo se repete —
 * duas planilhas de memória de cálculo na mesma medição são normais.
 */
export function acervoDaMedicao<D extends DocumentoDoAcervo>(
  entrada: Omit<Entrada<D>, "pertence" | "permiteRepeticao">,
): Array<LinhaAcervo<D>> {
  return montarAcervo({ ...entrada, permiteRepeticao: () => true });
}

export type ResumoAcervo = {
  anexados: number;
  faltando: number;
  dispensados: number;
  /** Tipos ainda cobrados — anexados mais faltando. */
  cobrados: number;
};

/**
 * Os números do cabeçalho, contados por tipo e não por arquivo — e só sobre o
 * que esta tela cobra: arquivo de outra tela, ou de tipo fora da lista, não
 * entra na conta de "o que falta".
 *
 * Os tipos opcionais também não entram — "Outros" nas duas telas, mais termo
 * aditivo e apostilamento, que o cliente pediu "em caso de necessidade". Têm
 * linha, mas não são documento necessário: contá-los deixaria toda obra com
 * uma pendência que nunca fecha.
 */
export function resumoDoAcervo(linhas: Array<LinhaAcervo<unknown>>): ResumoAcervo {
  const situacaoPorTipo = new Map<TipoDocumento, SituacaoLinha>();
  for (const l of linhas) {
    if (l.classe !== "ESPERADO") continue;
    if (ehOpcional(l.tipo)) continue;
    // "Anexado" ganha de "não anexado" no mesmo tipo: onde o tipo se repete, a
    // linha de inclusão convive com os arquivos e não pode contar como falta.
    if (l.situacao === "ANEXADO" || !situacaoPorTipo.has(l.tipo)) {
      situacaoPorTipo.set(l.tipo, l.situacao);
    }
  }

  const situacoes = [...situacaoPorTipo.values()];
  const anexados = situacoes.filter((s) => s === "ANEXADO").length;
  const faltando = situacoes.filter((s) => s === "FALTANDO").length;
  return {
    anexados,
    faltando,
    dispensados: situacoes.filter((s) => s === "DISPENSADO").length,
    cobrados: anexados + faltando,
  };
}
