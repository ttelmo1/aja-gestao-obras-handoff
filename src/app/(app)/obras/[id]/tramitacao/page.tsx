import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Dado } from "@/components/ui/dados";
import { BadgeEtapa, FluxoEtapas, type PassoDoFluxo } from "@/components/ui/fluxo-etapas";
import { Alerta } from "@/components/ui/formulario";
import { formatarData } from "@/lib/date-br";
import { exigirPermissao } from "@/lib/guarda";
import { prisma } from "@/lib/prisma";
import { TipoEtapa } from "@/generated/prisma/enums";
import { pode } from "@/modules/auth/permissoes";
import { FLUXO_FIXO, ROTULOS_ETAPA, estaAberta } from "@/modules/tramitacao/fluxo";
import { situacaoDaTramitacao } from "@/modules/tramitacao/movimentos";

import { carregarDocumentos, carregarEtapas, carregarObra, paraCampoData } from "../dados";
import { EnviarDocumentos } from "../documentos/enviar";
import { ListaDocumentos } from "../documentos/lista";
import { FormEntrada, FormEtapa } from "./formularios";
import { TabelaMovimentos } from "./tabela-movimentos";

export const metadata = { title: "Tramitação" };
export const dynamic = "force-dynamic";

const TIPOS = new Set<string>(FLUXO_FIXO);

/**
 * Aba Tramitação — o fluxo fixo dos requisitos (1.5).
 *
 * A faixa de passos no topo é a do mockup; embaixo abre **uma** etapa por vez,
 * escolhida pela query `?etapa=`. Onze formulários empilhados numa página só
 * seriam ilegíveis, e a seleção por link mantém a tela funcionando sem
 * JavaScript, como o resto do sistema.
 */
export default async function TramitacaoPage({
  params,
  searchParams,
}: PageProps<"/obras/[id]/tramitacao">) {
  const usuario = await exigirPermissao("tramitacao", "ver");
  const { id } = await params;
  const { etapa: etapaQuery } = await searchParams;

  const [obra, etapas, documentos, setores] = await Promise.all([
    carregarObra(id),
    carregarEtapas(id),
    carregarDocumentos(id),
    prisma.setor.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, sigla: true },
    }),
  ]);
  if (!obra) notFound();

  const agora = new Date();
  const hoje = paraCampoData(agora) ?? "";

  const passos: PassoDoFluxo[] = etapas.map((e) => {
    const s = situacaoDaTramitacao(e.movimentos, agora);
    return {
      id: e.id,
      tipo: e.tipo,
      ordem: e.ordem,
      status: e.status,
      setorAtual: s.atual?.setorDestino.nome ?? null,
      diasParado: s.diasParado,
      movimentos: e.movimentos.length,
    };
  });

  // Sem escolha explícita, abre onde o processo está: a primeira etapa com
  // movimento em aberto; senão, a primeira ainda não concluída.
  const pedida = typeof etapaQuery === "string" && TIPOS.has(etapaQuery)
    ? (etapaQuery as TipoEtapa)
    : null;
  const selecionada =
    pedida ??
    passos.find((p) => p.diasParado !== null)?.tipo ??
    passos.find((p) => estaAberta(p.status))?.tipo ??
    FLUXO_FIXO[0];

  const etapa = etapas.find((e) => e.tipo === selecionada);
  if (!etapa) notFound();

  const situacao = situacaoDaTramitacao(etapa.movimentos, agora);
  const podeEditar = pode(usuario.perfil, "tramitacao", "editar");
  const podeCriar = pode(usuario.perfil, "tramitacao", "criar");
  const dispensada = etapa.status === "NAO_SE_APLICA";

  // Documentos presos à etapa em si, mais os presos a qualquer setor por onde
  // ela passou — é o acervo da etapa como o usuário a enxerga.
  const idsDosMovimentos = new Set(etapa.movimentos.map((m) => m.id));
  const documentosDaEtapa = documentos.filter(
    (d) =>
      d.etapaObraId === etapa.id ||
      (d.movimentoId !== null && idsDosMovimentos.has(d.movimentoId)),
  );

  return (
    <div className="flex flex-col gap-4">
      <Card titulo="Fluxo do processo">
        <p className="mb-3 text-sm text-[var(--muted)]">
          A sequência é a mesma em todo contrato. O que muda de um para outro é
          uma etapa ser marcada como <strong>não se aplica</strong> — a ordem
          nunca muda.
        </p>
        <FluxoEtapas
          passos={passos}
          base={`/obras/${obra.id}/tramitacao`}
          selecionada={selecionada}
        />
      </Card>

      <Card
        titulo={`${etapa.ordem}. ${ROTULOS_ETAPA[etapa.tipo]}`}
        acao={<BadgeEtapa status={etapa.status} />}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Dado rotulo="Início">{formatarData(etapa.dataInicio)}</Dado>
          <Dado rotulo="Conclusão">{formatarData(etapa.dataConclusao)}</Dado>
          <Dado rotulo={situacao.abertos > 1 ? "Parado há mais tempo" : "Setor atual"}>
            {situacao.atual ? (
              <span className={situacao.diasParado! >= 15 ? "text-[var(--danger)]" : undefined}>
                {situacao.atual.setorDestino.nome} · há {situacao.diasParado} dia(s)
                {situacao.abertos > 1 && (
                  <span className="block text-xs font-normal text-[var(--muted)]">
                    e mais {situacao.abertos - 1} processo(s) em aberto
                  </span>
                )}
              </span>
            ) : (
              "—"
            )}
          </Dado>
          <Dado rotulo="Tempo somado">
            {situacao.quantidadeMovimentos > 0 ? `${situacao.diasTotais} dia(s)` : "—"}
          </Dado>
        </div>

        {etapa.observacoes && (
          <p className="mt-4 border-t border-[var(--border)] pt-4 text-sm whitespace-pre-line">
            {etapa.observacoes}
          </p>
        )}
      </Card>

      <Card titulo="Percurso pelos setores">
        {dispensada ? (
          <Alerta tipo="sucesso">
            Etapa marcada como não se aplica neste contrato. Nada a tramitar
            aqui.
          </Alerta>
        ) : (
          <TabelaMovimentos
            movimentos={etapa.movimentos}
            documentos={documentos}
            agora={agora}
            hoje={hoje}
            podeEditar={podeEditar}
            podeExcluir={pode(usuario.perfil, "tramitacao", "excluir")}
            mostrarMedicao={etapa.tipo === TipoEtapa.MEDICOES}
          />
        )}
      </Card>

      {podeCriar &&
        !dispensada &&
        (etapa.tipo === TipoEtapa.MEDICOES ? (
          <Card titulo="Encaminhar a um setor">
            <p className="text-sm text-[var(--muted)]">
              Cada medição tem protocolo próprio e caminha sozinha pelos
              setores, então a tramitação desta etapa é feita medição a
              medição.{" "}
              <Link
                href={`/obras/${obra.id}/medicoes`}
                className="font-bold text-[var(--primary)] underline underline-offset-2"
              >
                Abrir a aba Medições
              </Link>
              . O quadro acima reúne o percurso de todas elas.
            </p>
          </Card>
        ) : (
          <Card titulo="Encaminhar a um setor">
            <FormEntrada etapaObraId={etapa.id} setores={setores} hoje={hoje} />
          </Card>
        ))}

      {!dispensada && (
        <Card
          titulo={
            situacao.atual
              ? `Documentos da etapa · ${situacao.atual.setorDestino.nome}`
              : "Documentos da etapa"
          }
        >
          <ListaDocumentos
            documentos={documentosDaEtapa}
            podeExcluir={pode(usuario.perfil, "documento", "excluir")}
            mostrarOrigem={false}
            vazio="Nenhum documento anexado a esta etapa."
          />

          {pode(usuario.perfil, "documento", "criar") && (
            <div className="mt-5 border-t border-[var(--border)] pt-5">
              <EnviarDocumentos
                obraId={obra.id}
                contexto="etapa"
                etapaObraId={etapa.id}
                movimentoId={situacao.atual?.id}
                titulo={
                  situacao.atual
                    ? `Adicionar documento ao setor atual: ${situacao.atual.setorDestino.nome}`
                    : "Adicionar documento à etapa"
                }
              />
            </div>
          )}
        </Card>
      )}

      {podeEditar && (
        <Card titulo="Situação da etapa">
          <FormEtapa
            etapaObraId={etapa.id}
            padrao={{
              status: etapa.status,
              dataInicio: paraCampoData(etapa.dataInicio),
              dataConclusao: paraCampoData(etapa.dataConclusao),
              observacoes: etapa.observacoes,
            }}
          />
        </Card>
      )}
    </div>
  );
}
