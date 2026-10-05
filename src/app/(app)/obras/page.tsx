import Link from "next/link";

import { Indicador, TituloPagina } from "@/components/ui/card";
import { Vazio } from "@/components/ui/vazio";
import { exigirPermissao } from "@/lib/guarda";
import { formatarBRL } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { pode } from "@/modules/auth/permissoes";
import {
  pagamentosPendentes,
  totalPendente,
} from "@/modules/medicoes/pagamento";
import {
  filtrosParaQuery,
  lerFiltros,
  temFiltroAtivo,
} from "@/modules/obras/filtros";
import { totaisDoPainel } from "@/modules/obras/resumo";

import { CartaoObra } from "./cartao";
import { BarraDeFiltros } from "./filtros";
import { carregarObrasDoPainel } from "./painel";

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

  const [visiveis, operadores, contratantes] = await Promise.all([
    carregarObrasDoPainel(filtros, agora),
    // Operadores são usuários do sistema, não o cadastro de responsáveis:
    // quem assume a obra é quem está logado.
    prisma.usuario.findMany({
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

  const totais = totaisDoPainel(visiveis);
  const pendente = totalPendente(pagamentosPendentes(visiveis));
  const podeVerLista = pode(usuario.perfil, "medicao", "ver");

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
        operadores={operadores}
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
        {/* Pedido de 24/09/2026: valor somado e quantidade, e o quadro abre
            a lista — "apenas informativa"; alterar continua na medição. */}
        <Indicador
          rotulo="Pagamento pendente"
          valor={formatarBRL(pendente.valor)}
          detalhe={`${pendente.quantidade} medição(ões)${podeVerLista ? " · ver lista" : ""}`}
          alerta={pendente.quantidade > 0}
          href={
            podeVerLista
              ? `/obras/pagamentos-pendentes${filtrosParaQuery(filtros)}`
              : undefined
          }
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
