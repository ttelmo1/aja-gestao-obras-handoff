import { Farol, StatusObra } from "@/generated/prisma/enums";

/**
 * Filtros do painel (requisitos.md 1.9: busca por obra, contrato, protocolo,
 * responsável e status/farol).
 *
 * A leitura da URL é feita aqui, e não na página, por dois motivos: a mesma
 * interpretação serve ao painel e ao relatório da etapa 11, e valor inválido
 * vindo de URL editada à mão precisa virar "sem filtro", nunca erro de tela.
 */
export type Filtros = {
  busca: string;
  status: StatusObra | null;
  farol: Farol | null;
  responsavelId: string | null;
  contratanteId: string | null;
};

export const FILTROS_VAZIOS: Filtros = {
  busca: "",
  status: null,
  farol: null,
  responsavelId: null,
  contratanteId: null,
};

type Entrada = Record<string, string | string[] | undefined>;

function texto(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

function opcao<T extends string>(
  v: string | string[] | undefined,
  validos: readonly T[],
): T | null {
  const s = texto(v);
  return (validos as readonly string[]).includes(s) ? (s as T) : null;
}

export function lerFiltros(params: Entrada): Filtros {
  return {
    busca: texto(params.busca),
    status: opcao(params.status, Object.values(StatusObra)),
    farol: opcao(params.farol, Object.values(Farol)),
    responsavelId: texto(params.responsavel) || null,
    contratanteId: texto(params.contratante) || null,
  };
}

export function temFiltroAtivo(f: Filtros): boolean {
  return (
    f.busca !== "" ||
    f.status !== null ||
    f.farol !== null ||
    f.responsavelId !== null ||
    f.contratanteId !== null
  );
}

/**
 * Condição de banco para tudo, **menos o farol**.
 *
 * O farol não é coluna confiável para filtrar: ele é derivado do prazo, das
 * medições e da tramitação, e uma coluna cacheada envelhece sozinha entre uma
 * edição e outra — filtrar por ela devolveria obra com a luz errada. Então o
 * banco filtra o que é fato registrado e o farol é aplicado depois, sobre o
 * resultado já calculado. Ver `filtrarPorFarol`.
 */
export function condicaoDeBusca(f: Filtros) {
  const onde: Record<string, unknown> = {};

  if (f.status) onde.status = f.status;
  if (f.responsavelId) onde.responsavelId = f.responsavelId;
  if (f.contratanteId) onde.contratanteId = f.contratanteId;

  if (f.busca) {
    const contem = { contains: f.busca, mode: "insensitive" as const };
    onde.OR = [
      { codigo: contem },
      { objeto: contem },
      { numeroContrato: contem },
      { numeroProcesso: contem },
      { contratante: { nome: contem } },
      { responsavel: { nome: contem } },
    ];
  }

  return onde;
}

export function filtrarPorFarol<T extends { farol: Farol }>(
  itens: T[],
  farol: Farol | null,
): T[] {
  return farol ? itens.filter((i) => i.farol === farol) : itens;
}

export const ROTULOS_STATUS: Record<StatusObra, string> = {
  PLANEJAMENTO: "Planejamento",
  EM_ANDAMENTO: "Em andamento",
  PARALISADA: "Paralisada",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada",
};

export const STATUS_OBRA = Object.values(StatusObra);
export const FAROIS = Object.values(Farol);
