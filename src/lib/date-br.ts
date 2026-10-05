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

/**
 * Partes da data no fuso de Brasília — base para ancorar ida e volta entre
 * `Date` e a string "AAAA-MM-DD" que trafega na URL dos filtros.
 */
const PARTES = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const ISO_DATA = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Quanto o fuso de Brasília está adiantado/atrasado em relação ao UTC, em ms.
 *
 * O instante é truncado ao segundo antes de formatar: o `Intl` arredonda
 * fração de segundo para cima, e um `.999` viraria o segundo seguinte —
 * deslocamento errado por 1 ms.
 */
function deslocamentoMs(instante: Date): number {
  const segundoCheio = Math.floor(instante.getTime() / 1000) * 1000;
  const p = Object.fromEntries(
    PARTES.formatToParts(new Date(segundoCheio)).map((x) => [x.type, x.value]),
  );
  const comoSeFosseUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour) % 24,
    Number(p.minute),
    Number(p.second),
  );
  return comoSeFosseUtc - segundoCheio;
}

/**
 * "AAAA-MM-DD" de um instante, no fuso de Brasília.
 *
 * Serve tanto para preencher `<input type="date">` quanto para devolver o
 * filtro à URL. Nunca usar `toISOString().slice(0, 10)` para isso: aquilo
 * responde em UTC e, num servidor em Brasília, joga o fim do dia para a data
 * seguinte — a cada página, o filtro se alargaria um dia.
 */
export function dataParaIso(d: Date): string {
  // Formatador sem hora de propósito: com segundos, o `Intl` arredondaria
  // 23:59:59.999 para o dia seguinte.
  return ISO_DATA.format(d);
}

/**
 * Instante correspondente a "AAAA-MM-DD" em Brasília — início ou fim do dia.
 *
 * Ancorado no fuso, não no `TZ` do processo: o servidor do cliente pode estar
 * em UTC, e a mesma consulta precisa devolver o mesmo dia nos dois casos.
 */
export function isoParaInstante(iso: string, fimDoDia = false): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const base = new Date(`${iso}T${fimDoDia ? "23:59:59.999" : "00:00:00.000"}Z`);
  if (Number.isNaN(base.getTime())) return null;
  // Duas passadas: a primeira estima o instante, a segunda resolve o
  // deslocamento no instante certo. Só faz diferença se o horário de verão
  // voltar, mas custa uma linha.
  const estimado = new Date(base.getTime() - deslocamentoMs(base));
  return new Date(base.getTime() - deslocamentoMs(estimado));
}

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
 * Dias corridos entre duas datas, contados pelo dia civil em Brasília.
 *
 * Cada ponta é reduzida ao seu dia no fuso do sistema, não no `TZ` do
 * processo: num servidor em UTC, tudo que acontece depois das 21h já cai no
 * dia seguinte, e "dias parado" erraria por um dia toda noite.
 */
export function diasEntre(inicio: Date, fim: Date): number {
  return Math.round((meiaNoiteBr(fim) - meiaNoiteBr(inicio)) / MS_POR_DIA);
}

/** Instante do início do dia civil brasiliense, em ms, para contagem de dias. */
function meiaNoiteBr(d: Date): number {
  const [ano, mes, dia] = dataParaIso(d).split("-").map(Number);
  return Date.UTC(ano!, mes! - 1, dia!);
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
