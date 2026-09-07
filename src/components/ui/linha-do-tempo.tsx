import type { AcaoAuditoria } from "@/generated/prisma/enums";
import { formatarDataHora } from "@/lib/date-br";
import { CORES_ACAO, rotuloDaEntidade } from "@/modules/auditoria/rotulos";

export type EventoDaLinha = {
  id: string;
  criadoEm: Date;
  usuarioNome: string;
  acao: AcaoAuditoria;
  entidade: string;
  descricao: string;
  ip: string | null;
  dadosAntes: unknown;
  dadosDepois: unknown;
};

/**
 * Linha do tempo do mockup: filete vertical, ponto colorido por evento, data
 * e hora miúdas em cima e o autor em navio dentro da frase.
 *
 * A cor do ponto reforça a ação, mas nunca é o único sinal — a ação também
 * vem escrita na etiqueta ao lado da data.
 */
export function LinhaDoTempo({ eventos }: { eventos: EventoDaLinha[] }) {
  return (
    <ol className="relative ml-2 border-l-2 border-[var(--border)] pl-6">
      {eventos.map((e) => (
        <li key={e.id} className="relative pb-5 last:pb-0">
          <span
            aria-hidden
            className="absolute top-1 -left-[31px] size-2.5 rounded-full ring-4 ring-[var(--surface)]"
            style={{ background: CORES_ACAO[e.acao] }}
          />

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
            <time dateTime={e.criadoEm.toISOString()}>
              {formatarDataHora(e.criadoEm)}
            </time>
            <span className="rounded-full bg-[var(--background)] px-2 py-0.5 font-bold tracking-wide uppercase">
              {rotuloDaEntidade(e.entidade)}
            </span>
            {e.ip && <span title="Endereço de origem">{e.ip}</span>}
          </div>

          {/*
            O autor fica aqui, e não dentro da frase: as descrições que os
            módulos gravam são passivas ("Obra X alterada"), e prefixar o nome
            produzia "Administrador Obra X alterada".
          */}
          <p className="mt-1 text-sm">
            <strong className="text-[var(--primary)]">{e.usuarioNome}</strong>
            <span className="text-[var(--muted)]"> · </span>
            {e.descricao}
          </p>

          <Mudancas antes={e.dadosAntes} depois={e.dadosDepois} />
        </li>
      ))}
    </ol>
  );
}

/**
 * O "de X para Y" de cada campo alterado.
 *
 * Vem em `<details>` fechado: numa obra com muitas edições, abrir tudo faria
 * a linha do tempo perder a leitura corrida que o mockup tem. Quem está
 * auditando de fato clica.
 */
function Mudancas({ antes, depois }: { antes: unknown; depois: unknown }) {
  const a = comoObjeto(antes);
  const d = comoObjeto(depois);
  const campos = [...new Set([...Object.keys(a), ...Object.keys(d)])];
  if (campos.length === 0) return null;

  return (
    <details className="mt-1.5">
      <summary className="cursor-pointer text-xs text-[var(--muted)] underline underline-offset-2">
        {campos.length} campo(s)
      </summary>
      <dl className="mt-1.5 grid gap-1 rounded-lg bg-[var(--surface-sutil)] p-2.5 text-xs sm:grid-cols-[auto_1fr]">
        {campos.map((campo) => (
          <div key={campo} className="contents">
            <dt className="font-bold text-[var(--muted)]">{campo}</dt>
            <dd className="tabular">
              {campo in a && (
                <span className="text-[var(--muted)] line-through">
                  {valor(a[campo])}
                </span>
              )}
              {campo in a && campo in d && " → "}
              {campo in d && <span>{valor(d[campo])}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function comoObjeto(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

function valor(v: unknown): string {
  if (v === null || v === undefined || v === "") return "vazio";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** Estado vazio com a explicação certa para cada caso. */
export function SemEventos({ filtrado }: { filtrado: boolean }) {
  return (
    <p className="py-8 text-center text-sm text-[var(--muted)]">
      {filtrado
        ? "Nenhum registro encontrado com esses filtros."
        : "Nenhum registro ainda. Toda ação relevante aparece aqui automaticamente."}
    </p>
  );
}
