import Link from "next/link";
import { notFound } from "next/navigation";

import { BadgeRerratificacao } from "@/components/ui/badge-rerratificacao";
import { Card } from "@/components/ui/card";
import { Dado } from "@/components/ui/dados";
import { Alerta } from "@/components/ui/formulario";
import { Celula, Linha, Tabela } from "@/components/ui/tabela";
import { Vazio } from "@/components/ui/vazio";
import { formatarData } from "@/lib/date-br";
import { exigirPermissao } from "@/lib/guarda";
import { formatarBRL, formatarPercentual } from "@/lib/money";
import { pode } from "@/modules/auth/permissoes";
import {
  impactoDasRerratificacoes,
  LIMITE_ACRESCIMO_PERCENTUAL,
  percentualAcumulado,
} from "@/modules/rerratificacoes/calculos";

import { carregarObra, carregarRerratificacoes } from "../dados";

export const metadata = { title: "Rerratificações" };
export const dynamic = "force-dynamic";

/**
 * Aba Rerratificações — o resumo agregado do requisito 1.7 `[AJUSTADO]`.
 *
 * Não há listagem de item alterado, por decisão de escopo: isso já consta na
 * planilha apresentada ao órgão, que fica anexada como documento. O que a
 * tela mostra é o impacto — percentual, valor e prazo.
 */
export default async function RerratificacoesPage({
  params,
  searchParams,
}: PageProps<"/obras/[id]/rerratificacoes">) {
  const usuario = await exigirPermissao("rerratificacao", "ver");
  const { id } = await params;
  const { salva } = await searchParams;

  const [obra, rerratificacoes] = await Promise.all([
    carregarObra(id),
    carregarRerratificacoes(id),
  ]);
  if (!obra) notFound();

  const impacto = impactoDasRerratificacoes(rerratificacoes);
  const acumulado = percentualAcumulado(obra.valorContratado, impacto.valorAprovado);
  const podeEditar = pode(usuario.perfil, "rerratificacao", "editar");

  return (
    <div className="flex flex-col gap-4">
      {salva && <Alerta tipo="sucesso">Rerratificação salva.</Alerta>}

      {acumulado.excedeLimite && (
        <Alerta tipo="erro">
          Os aditivos aprovados somam {formatarPercentual(acumulado.percentual)} do
          valor original do contrato, acima do limite de referência de{" "}
          {LIMITE_ACRESCIMO_PERCENTUAL}% da Lei 14.133/2021 (art. 125). Reforma
          de edifício admite 50% — confira o enquadramento com o jurídico.
        </Alerta>
      )}

      <Card
        titulo="Impacto no contrato"
        acao={
          pode(usuario.perfil, "rerratificacao", "criar") && (
            <Link
              href={`/obras/${obra.id}/rerratificacoes/nova`}
              className="rounded-lg bg-[var(--accent)] px-3.5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--accent-hover)]"
            >
              Nova rerratificação
            </Link>
          )
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Dado rotulo="Valor original">
            <span className="tabular">{formatarBRL(obra.valorContratado)}</span>
          </Dado>
          <Dado rotulo="Aditivado (aprovado)">
            <span className="tabular">{formatarBRL(impacto.valorAprovado)}</span>
          </Dado>
          <Dado rotulo="Valor atual do contrato">
            <span className="tabular">
              {formatarBRL(obra.valorContratado.plus(impacto.valorAprovado))}
            </span>
          </Dado>
          <Dado rotulo="Acréscimo acumulado">
            <span
              className={acumulado.excedeLimite ? "text-[var(--danger)]" : undefined}
            >
              {formatarPercentual(acumulado.percentual)}
            </span>
          </Dado>
        </div>

        <div className="mt-4 grid gap-3 border-t border-[var(--border)] pt-4 sm:grid-cols-3">
          <Dado rotulo="Aprovadas">{impacto.quantidadeAprovadas}</Dado>
          <Dado rotulo="Em tramitação">
            {impacto.quantidadeEmAndamento}
            {impacto.quantidadeEmAndamento > 0 && (
              <span className="ml-1.5 text-xs font-normal text-[var(--muted)]">
                ({formatarBRL(impacto.valorEmAndamento)} ainda não somados)
              </span>
            )}
          </Dado>
          <Dado rotulo="Prazo adicional aprovado">
            {impacto.prazoAdicionalDias > 0
              ? `${impacto.prazoAdicionalDias} dia(s)`
              : "—"}
          </Dado>
        </div>

        <p className="mt-4 rounded-lg border-l-4 border-[var(--gold)] bg-[#fff9ed] p-3 text-[13px]">
          Só rerratificação <strong>aprovada</strong> entra no valor do
          contrato. As que ainda tramitam podem ser negadas — somá-las agora
          inflaria o saldo a medir com dinheiro que talvez nunca exista.
        </p>
      </Card>

      <Card titulo={`Rerratificações (${rerratificacoes.length})`}>
        {rerratificacoes.length === 0 ? (
          <Vazio mensagem="Nenhuma rerratificação registrada nesta obra." />
        ) : (
          <Tabela
            colunas={[
              "Nº",
              "Data",
              "Descrição",
              "Itens alterados",
              "Valor impactado",
              "% alcançado",
              "Prazo",
              "Protocolo",
              "Situação",
              "Documentos",
              "Observações",
            ]}
          >
            {rerratificacoes.map((r) => (
              <Linha key={r.id}>
                <Celula>
                  {podeEditar ? (
                    <Link
                      href={`/obras/${obra.id}/rerratificacoes/${r.id}`}
                      className="font-bold text-[var(--primary)] underline underline-offset-2"
                    >
                      {String(r.numero).padStart(2, "0")}
                    </Link>
                  ) : (
                    <strong>{String(r.numero).padStart(2, "0")}</strong>
                  )}
                </Celula>
                <Celula>{formatarData(r.data)}</Celula>
                <Celula>{r.descricao ?? "—"}</Celula>
                <Celula tabular apagada>
                  {r.quantidadeItens ? `${r.quantidadeItens} itens` : "—"}
                </Celula>
                <Celula tabular>
                  <span
                    style={{
                      color: r.valorImpactado.isNegative()
                        ? "var(--danger)"
                        : undefined,
                    }}
                  >
                    {formatarBRL(r.valorImpactado)}
                  </span>
                </Celula>
                <Celula tabular>{formatarPercentual(r.percentualAlcancado)}</Celula>
                <Celula tabular apagada>
                  {r.prazoAdicionalDias ? `+${r.prazoAdicionalDias} d` : "—"}
                </Celula>
                <Celula apagada>{r.protocolo ?? "—"}</Celula>
                <Celula>
                  <BadgeRerratificacao status={r.status} />
                </Celula>
                <Celula tabular apagada>
                  {r._count.documentos}
                </Celula>
                <Celula apagada>{r.observacoes ?? "—"}</Celula>
              </Linha>
            ))}
          </Tabela>
        )}
      </Card>
    </div>
  );
}
