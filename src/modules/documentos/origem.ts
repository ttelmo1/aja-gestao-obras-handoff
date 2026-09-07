import type { TipoEtapa } from "@/generated/prisma/enums";
import { ROTULOS_ETAPA } from "@/modules/tramitacao/fluxo";

/**
 * De onde veio o documento.
 *
 * A central de documentos é a tela que reúne tudo que foi enviado nas outras
 * (requisitos.md 1.6), e o requisito central dela é **rastreabilidade**: o
 * arquivo continua ligado à entidade que o originou. Este módulo traduz os
 * quatro vínculos possíveis do registro em duas colunas legíveis — "Vinculado
 * a" e "Setor / Etapa", como no mockup.
 *
 * Fica em `modules/` sem React porque o relatório da etapa 11 precisa
 * escrever exatamente os mesmos rótulos no XLS.
 */
export type VinculosDoDocumento = {
  medicao: { numero: number } | null;
  etapaObra: { tipo: TipoEtapa } | null;
  movimento: { setorDestino: { nome: string } } | null;
  rerratificacao: { numero: number } | null;
};

export type Origem = {
  /** Chave estável para o filtro de origem da central. */
  chave: string;
  /** Coluna "Vinculado a". */
  rotulo: string;
  /** Coluna "Setor / Etapa". `null` vira travessão na tela. */
  setorOuEtapa: string | null;
};

const dois = (n: number) => String(n).padStart(2, "0");

/**
 * O vínculo mais específico ganha: um documento anexado ao percurso de uma
 * medição pertence à medição, e o setor onde ele entrou é informação
 * complementar, não a identidade dele.
 *
 * Sem nenhum vínculo além da obra, o documento é do contrato — é assim que o
 * mockup rotula o contrato assinado.
 */
export function origemDoDocumento(d: VinculosDoDocumento): Origem {
  const setor = d.movimento?.setorDestino.nome ?? null;
  const etapa = d.etapaObra ? ROTULOS_ETAPA[d.etapaObra.tipo] : null;
  const setorOuEtapa = setor ?? etapa;

  if (d.medicao) {
    return {
      chave: `medicao:${d.medicao.numero}`,
      rotulo: `Medição ${dois(d.medicao.numero)}`,
      setorOuEtapa,
    };
  }
  if (d.rerratificacao) {
    return {
      chave: `rerratificacao:${d.rerratificacao.numero}`,
      rotulo: `Rerratificação ${dois(d.rerratificacao.numero)}`,
      setorOuEtapa,
    };
  }
  if (d.etapaObra) {
    return {
      chave: `etapa:${d.etapaObra.tipo}`,
      rotulo: ROTULOS_ETAPA[d.etapaObra.tipo],
      setorOuEtapa: setor,
    };
  }
  return { chave: "contrato", rotulo: "Contrato", setorOuEtapa: null };
}

/**
 * Origens presentes na lista, para montar o seletor da central. Ordenadas
 * pelo rótulo, com "Contrato" sempre em primeiro: é o documento que existe
 * em toda obra e o que mais se procura.
 */
export function origensDisponiveis(
  documentos: VinculosDoDocumento[],
): Array<{ chave: string; rotulo: string }> {
  const mapa = new Map<string, string>();
  for (const d of documentos) {
    const o = origemDoDocumento(d);
    mapa.set(o.chave, o.rotulo);
  }
  return [...mapa]
    .map(([chave, rotulo]) => ({ chave, rotulo }))
    .sort((a, b) =>
      a.chave === "contrato"
        ? -1
        : b.chave === "contrato"
          ? 1
          : a.rotulo.localeCompare(b.rotulo, "pt-BR"),
    );
}
