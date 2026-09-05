import Link from "next/link";

import type { StatusEtapa, TipoEtapa } from "@/generated/prisma/enums";
import {
  CORES_STATUS_ETAPA,
  ROTULOS_ETAPA,
  ROTULOS_STATUS_ETAPA,
} from "@/modules/tramitacao/fluxo";

export type PassoDoFluxo = {
  id: string;
  tipo: TipoEtapa;
  ordem: number;
  status: StatusEtapa;
  /** Setor onde o processo está agora, se estiver parado em algum. */
  setorAtual: string | null;
  diasParado: number | null;
  movimentos: number;
};

/**
 * O fluxo fixo desenhado como a faixa de passos do mockup (`.flow`): caixas
 * ligadas por seta, a atual destacada, as concluídas em verde.
 *
 * Rola de lado dentro do próprio contêiner — são onze etapas e a página não
 * pode rolar horizontalmente. Cada passo é um link que troca a etapa aberta
 * embaixo, então a tela inteira funciona sem JavaScript.
 */
export function FluxoEtapas({
  passos,
  base,
  selecionada,
}: {
  passos: PassoDoFluxo[];
  /** URL da aba, sem query. */
  base: string;
  selecionada: TipoEtapa;
}) {
  return (
    <div className="overflow-x-auto pb-1">
      <ol className="flex min-w-max items-stretch gap-1.5">
        {passos.map((passo, i) => {
          const cor = CORES_STATUS_ETAPA[passo.status];
          const ativa = passo.tipo === selecionada;
          const dispensada = passo.status === "NAO_SE_APLICA";

          return (
            <li key={passo.id} className="flex items-stretch gap-1.5">
              <Link
                href={`${base}?etapa=${passo.tipo}`}
                aria-current={ativa ? "step" : undefined}
                className="flex w-[172px] flex-col rounded-xl border p-3 transition-shadow hover:shadow-[var(--sombra-hover)]"
                style={{
                  background: cor.fundo,
                  borderColor: ativa ? "var(--gold)" : cor.borda,
                  borderWidth: ativa ? 2 : 1,
                }}
              >
                <span className="text-[11px] font-bold" style={{ color: cor.texto }}>
                  {passo.ordem}. {ROTULOS_STATUS_ETAPA[passo.status]}
                </span>
                <span
                  className={`mt-1 text-[13px] leading-tight font-bold text-[var(--foreground)] ${
                    dispensada ? "line-through opacity-60" : ""
                  }`}
                >
                  {ROTULOS_ETAPA[passo.tipo]}
                </span>

                {passo.setorAtual ? (
                  <span className="mt-2 text-[11px] text-[var(--muted)]">
                    {passo.setorAtual}
                    <br />
                    <strong
                      style={{
                        color:
                          passo.diasParado !== null && passo.diasParado >= 15
                            ? "var(--danger)"
                            : "var(--foreground)",
                      }}
                    >
                      há {passo.diasParado} dia(s)
                    </strong>
                  </span>
                ) : (
                  <span className="mt-2 text-[11px] text-[var(--muted)]">
                    {passo.movimentos === 0
                      ? "sem movimento"
                      : `${passo.movimentos} movimento(s)`}
                  </span>
                )}
              </Link>

              {i < passos.length - 1 && (
                <span
                  aria-hidden
                  className="self-center text-[var(--muted)] select-none"
                >
                  →
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Situação da etapa como badge, para usar fora da faixa de fluxo. */
export function BadgeEtapa({ status }: { status: StatusEtapa }) {
  const cor = CORES_STATUS_ETAPA[status];
  return (
    <span
      className="inline-block rounded-full border px-2.5 py-1 text-[11px] font-bold whitespace-nowrap"
      style={{ background: cor.fundo, color: cor.texto, borderColor: cor.borda }}
    >
      {ROTULOS_STATUS_ETAPA[status]}
    </span>
  );
}
