const FUSO = "America/Sao_Paulo";

const DATA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: FUSO,
});

const DATA_HORA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: FUSO,
});

const MES_ANO = new Intl.DateTimeFormat("pt-BR", {
  month: "2-digit",
  year: "numeric",
  timeZone: FUSO,
});

export function formatarData(d: Date | null | undefined): string {
  return d ? DATA.format(d) : "—";
}

export function formatarDataHora(d: Date | null | undefined): string {
  return d ? DATA_HORA.format(d) : "—";
}

/** Competência da medição: "09/2026". */
export function formatarCompetencia(d: Date | null | undefined): string {
  return d ? MES_ANO.format(d) : "—";
}

const MS_POR_DIA = 86_400_000;

/**
 * Dias corridos entre duas datas, normalizadas a meia-noite UTC para que
 * horário e horário de verão não produzam 0,9 ou 1,1 dia.
 */
export function diasEntre(inicio: Date, fim: Date): number {
  const a = Date.UTC(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const b = Date.UTC(fim.getFullYear(), fim.getMonth(), fim.getDate());
  return Math.round((b - a) / MS_POR_DIA);
}

/** Dias corridos desde `inicio` até agora. */
export function diasDesde(inicio: Date, agora: Date = new Date()): number {
  return diasEntre(inicio, agora);
}

export function adicionarDias(d: Date, dias: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + dias);
  return r;
}
