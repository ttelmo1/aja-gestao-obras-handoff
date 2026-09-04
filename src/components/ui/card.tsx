import type { ReactNode } from "react";

/**
 * Painel branco de canto arredondado — o `.panel` do mockup. É o contêiner
 * padrão de conteúdo em todas as telas.
 */
export function Card({
  titulo,
  acao,
  children,
}: {
  titulo?: string;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--sombra-card)]">
      {(titulo || acao) && (
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          {titulo && (
            <h2 className="text-[17px] font-bold text-[var(--primary)]">
              {titulo}
            </h2>
          )}
          {acao}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

/**
 * Indicador numérico do painel — o `.kpi` do mockup: rótulo pequeno e
 * apagado em cima, número grande em navio embaixo.
 */
export function Indicador({
  rotulo,
  valor,
  detalhe,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--sombra-card)]">
      <p className="text-[13px] text-[var(--muted)]">{rotulo}</p>
      <p className="tabular mt-1.5 text-2xl font-bold text-[var(--primary)]">
        {valor}
      </p>
      {detalhe && <p className="mt-1 text-xs text-[var(--muted)]">{detalhe}</p>}
    </div>
  );
}

/** Cabeçalho de página: título em navio à esquerda, ações à direita. */
export function TituloPagina({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-[26px] leading-tight font-bold text-[var(--primary)]">
          {titulo}
        </h1>
        {descricao && (
          <p className="mt-1 text-sm text-[var(--muted)]">{descricao}</p>
        )}
      </div>
      {acao}
    </div>
  );
}
