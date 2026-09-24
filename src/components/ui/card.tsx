import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Painel branco de canto arredondado — o `.panel` do mockup. É o contêiner
 * padrão de conteúdo em todas as telas.
 */
export function Card({
  id,
  titulo,
  acao,
  children,
}: {
  /**
   * Âncora do painel, para um atalho `href="#id"` levar até ele. O
   * `scroll-mt` evita que o topo do painel fique embaixo do cabeçalho fixo.
   */
  id?: string;
  titulo?: string;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-4 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--sombra-card)]"
    >
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
  href,
  alerta = false,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  /** Quando existe, o quadro inteiro vira link para o detalhe. */
  href?: string;
  /** Valor em vermelho — há pendência a olhar. */
  alerta?: boolean;
}) {
  const conteudo = (
    <>
      <p className="text-[13px] text-[var(--muted)]">{rotulo}</p>
      <p
        className={`tabular mt-1.5 text-2xl font-bold ${alerta ? "text-[var(--danger)]" : "text-[var(--primary)]"}`}
      >
        {valor}
      </p>
      {detalhe && <p className="mt-1 text-xs text-[var(--muted)]">{detalhe}</p>}
    </>
  );
  const classe =
    "block rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--sombra-card)]";

  if (!href) return <div className={classe}>{conteudo}</div>;
  return (
    <Link
      href={href}
      className={`${classe} transition-all hover:-translate-y-0.5 hover:shadow-[var(--sombra-hover)]`}
    >
      {conteudo}
    </Link>
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
