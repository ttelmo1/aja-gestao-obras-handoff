import Link from "next/link";

import { BadgeMedicao } from "@/components/ui/badge-medicao";
import { Card, TituloPagina } from "@/components/ui/card";
import { Celula, Linha, Tabela } from "@/components/ui/tabela";
import { Vazio } from "@/components/ui/vazio";
import { formatarCompetencia } from "@/lib/date-br";
import { exigirPermissao } from "@/lib/guarda";
import { formatarBRL } from "@/lib/money";
import { pode } from "@/modules/auth/permissoes";
import {
  type LinhaPagamentoPendente,
  medicoesEmRascunho,
  pagamentosPendentes,
  totalPendente,
} from "@/modules/medicoes/pagamento";
import {
  filtrosParaQuery,
  lerFiltros,
  temFiltroAtivo,
} from "@/modules/obras/filtros";

import { carregarObrasDoPainel } from "../painel";

export const metadata = { title: "Pagamentos pendentes" };
export const dynamic = "force-dynamic";

/**
 * Pagamentos pendentes de todas as obras — o que abre o quadro do painel.
 *
 * Pedido do Junior pela Fernanda em 24/09/2026: *"uma planilha com o nome da
 * obra, o número da medição e o valor"*, no formato da planilha que eles
 * mantêm hoje, e *"apenas informativa"* — alterar continua sendo dentro da
 * medição, e cada linha leva até ela.
 *
 * Parte das mesmas obras do painel, com os mesmos filtros, para a soma daqui
 * bater com o número do quadro que trouxe o usuário até aqui.
 *
 * As medições em rascunho vêm num bloco abaixo, com total próprio — pedido de
 * 09/10/2026, *"para não somar com o total das que já estão aprovadas"*.
 */
export default async function PagamentosPendentesPage({
  searchParams,
}: PageProps<"/obras/pagamentos-pendentes">) {
  const usuario = await exigirPermissao("medicao", "ver");
  const filtros = lerFiltros(await searchParams);

  const obras = await carregarObrasDoPainel(filtros, new Date());
  const linhas = pagamentosPendentes(obras);
  const total = totalPendente(linhas);
  const rascunhos = medicoesEmRascunho(obras);
  const totalRascunhos = totalPendente(rascunhos);
  const podeEditar = pode(usuario.perfil, "medicao", "editar");

  return (
    <div>
      <Link
        href={`/obras${filtrosParaQuery(filtros)}`}
        className="mb-3 inline-block text-sm text-[var(--muted)] underline underline-offset-2"
      >
        Voltar ao painel
      </Link>

      <TituloPagina
        titulo="Pagamentos pendentes"
        descricao={
          temFiltroAtivo(filtros)
            ? "Medições ainda não pagas das obras do filtro do painel."
            : "Medições ainda não pagas, de todas as obras."
        }
      />

      <div className="flex flex-col gap-4">
        <Card
          titulo={`${total.quantidade} medição(ões) · ${formatarBRL(total.valor)}`}
        >
          {linhas.length === 0 ? (
            <Vazio mensagem="Nenhuma medição com pagamento pendente." />
          ) : (
            <TabelaDeMedicoes linhas={linhas} podeEditar={podeEditar} />
          )}
        </Card>

        {rascunhos.length > 0 && (
          <Card
            titulo={`Em rascunho · ${totalRascunhos.quantidade} medição(ões) · ${formatarBRL(totalRascunhos.valor)}`}
          >
            <p className="mb-3 text-sm text-[var(--muted)]">
              Ainda não protocoladas — não entram no total acima.
            </p>
            <TabelaDeMedicoes linhas={rascunhos} podeEditar={podeEditar} />
          </Card>
        )}
      </div>
    </div>
  );
}

function TabelaDeMedicoes({
  linhas,
  podeEditar,
}: {
  linhas: LinhaPagamentoPendente[];
  podeEditar: boolean;
}) {
  return (
    <Tabela colunas={["Obra", "Medição", "Competência", "Situação", "Valor"]}>
      {linhas.map((l) => (
        <Linha key={l.medicaoId}>
          <Celula>
            <Link
              href={`/obras/${l.obraId}/medicoes`}
              className="font-bold text-[var(--primary)] underline underline-offset-2"
            >
              {l.objeto}
            </Link>
            <span className="block text-[12px] text-[var(--muted)]">
              Contrato {l.numeroContrato}
            </span>
          </Celula>
          <Celula>
            {podeEditar ? (
              <Link
                href={`/obras/${l.obraId}/medicoes/${l.medicaoId}`}
                className="whitespace-nowrap text-[var(--primary)] underline underline-offset-2"
              >
                {l.numero}ª medição
              </Link>
            ) : (
              <span className="whitespace-nowrap">{l.numero}ª medição</span>
            )}
          </Celula>
          <Celula apagada>{formatarCompetencia(l.competencia)}</Celula>
          <Celula>
            <BadgeMedicao status={l.status} />
          </Celula>
          <Celula tabular>
            <span className="whitespace-nowrap">{formatarBRL(l.valor)}</span>
          </Celula>
        </Linha>
      ))}
    </Tabela>
  );
}
