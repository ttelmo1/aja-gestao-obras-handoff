import Link from "next/link";

import { Indicador, TituloPagina } from "@/components/ui/card";
import { Vazio } from "@/components/ui/vazio";
import { exigirPermissao } from "@/lib/guarda";
import { formatarBRL } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { pode } from "@/modules/auth/permissoes";
import {
  condicaoDeBusca,
  filtrarPorFarol,
  lerFiltros,
  temFiltroAtivo,
} from "@/modules/obras/filtros";
import { DIAS_PARA_CONTAR_PARADO, resumoDaObra, totaisDoPainel } from "@/modules/obras/resumo";
import { diasParadoDaObra } from "@/modules/tramitacao/movimentos";

import { CartaoObra, type ObraNoPainel } from "./cartao";
import { BarraDeFiltros } from "./filtros";

export const metadata = { title: "Painel de Obras" };
export const dynamic = "force-dynamic";

/**
 * Painel de Obras — a tela inicial do sistema, na estrutura do mockup:
 * filtros, indicadores e cartões.
 *
 * O farol de cada obra é **calculado na leitura**, não lido da coluna
 * `farol`. A coluna é cache: ela envelhece sozinha conforme o prazo corre, e
 * um painel que existe para avisar de atraso não pode mostrar luz vencida.
 * Por isso o filtro de farol também é aplicado depois da consulta.
 */
export default async function ObrasPage({ searchParams }: PageProps<"/obras">) {
  const usuario = await exigirPermissao("obra", "ver");
  const filtros = lerFiltros(await searchParams);
  const agora = new Date();

  const [registros, responsaveis, contratantes] = await Promise.all([
    prisma.obra.findMany({
      where: condicaoDeBusca(filtros),
      orderBy: [{ dataPrevistaTermino: "asc" }, { criadoEm: "desc" }],
      select: {
        id: true,
        codigo: true,
        objeto: true,
        numeroContrato: true,
        status: true,
        valorContratado: true,
        valorAditivado: true,
        dataOrdemInicio: true,
        dataPrevistaTermino: true,
        periodicidadeMedicao: true,
        intervaloMedicaoDias: true,
        contratante: { select: { nome: true } },
        responsavel: { select: { nome: true } },
        medicoes: {
          select: {
            valorMedido: true,
            competencia: true,
            dataMedicao: true,
          },
        },
        // Só os movimentos em aberto: `dataSaida IS NULL` é a definição de
        // processo parado, e é o que o índice do schema serve.
        etapas: {
          select: {
            movimentos: {
              where: { dataSaida: null },
              select: { dataEntrada: true, dataSaida: true },
            },
          },
        },
      },
    }),
    prisma.responsavel.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.contratante.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ]);

  const obras: ObraNoPainel[] = registros.map((o) => ({
    ...o,
    resumo: resumoDaObra(
      o,
      o.medicoes,
      diasParadoDaObra(
        o.etapas.flatMap((e) => e.movimentos),
        agora,
      ),
      agora,
    ),
  }));

  const visiveis = filtrarPorFarol(
    obras.map((o) => ({ ...o, farol: o.resumo.farol })),
    filtros.farol,
  );
  const totais = totaisDoPainel(visiveis);

  return (
    <div>
      <TituloPagina
        titulo="Painel de Obras"
        descricao="Situação de cada contrato, com farol calculado automaticamente."
        acao={
          pode(usuario.perfil, "obra", "criar") && (
            <Link
              href="/obras/nova"
              className="rounded-lg bg-[var(--accent)] px-3.5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--accent-hover)]"
            >
              Nova obra
            </Link>
          )
        }
      />

      <BarraDeFiltros
        filtros={filtros}
        responsaveis={responsaveis}
        contratantes={contratantes}
      />

      <div className="mb-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Indicador
          rotulo="Obras no filtro"
          valor={String(totais.quantidade)}
          detalhe={`${totais.emAndamento} em andamento`}
        />
        <Indicador
          rotulo="Valor contratado"
          valor={formatarBRL(totais.valorContratado)}
        />
        <Indicador rotulo="Valor medido" valor={formatarBRL(totais.valorMedido)} />
        <Indicador rotulo="Saldo a medir" valor={formatarBRL(totais.saldoAMedir)} />
        <Indicador
          rotulo="Medições atrasadas"
          valor={String(totais.medicoesAtrasadas)}
          detalhe="Ciclo de medição vencido"
        />
        <Indicador
          rotulo="Processos parados"
          valor={String(totais.processosParados)}
          detalhe={`Há ${DIAS_PARA_CONTAR_PARADO} dias ou mais num setor`}
        />
      </div>

      {visiveis.length === 0 ? (
        <Vazio
          mensagem={
            temFiltroAtivo(filtros)
              ? "Nenhuma obra encontrada com esses filtros."
              : "Nenhuma obra cadastrada ainda."
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {visiveis.map((obra) => (
            <CartaoObra key={obra.id} obra={obra} />
          ))}
        </div>
      )}
    </div>
  );
}
