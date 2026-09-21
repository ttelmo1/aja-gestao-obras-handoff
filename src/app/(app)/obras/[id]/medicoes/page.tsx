import Link from "next/link";
import { notFound } from "next/navigation";

import { BadgeMedicao } from "@/components/ui/badge-medicao";
import { Card } from "@/components/ui/card";
import { Dado } from "@/components/ui/dados";
import { Alerta } from "@/components/ui/formulario";
import { Celula, Linha, Tabela } from "@/components/ui/tabela";
import { Vazio } from "@/components/ui/vazio";
import { formatarCompetencia, formatarData } from "@/lib/date-br";
import { exigirPermissao } from "@/lib/guarda";
import { formatarBRL, formatarPercentual, somar } from "@/lib/money";
import { pode } from "@/modules/auth/permissoes";
import { contarDocumentosPorMedicao } from "@/modules/medicoes/exclusao";
import {
  filtrarMedicoes,
  lerFiltrosMedicao,
  pagamentoPendente,
  temFiltroMedicao,
} from "@/modules/medicoes/filtros";
import { resumoDaObra } from "@/modules/obras/resumo";

import { carregarDocumentos, carregarMedicoes, carregarObra } from "../dados";
import { medicaoParaExcluir } from "./exclusao";
import { FiltrosDasMedicoes } from "./filtros";
import { BotaoExcluirMedicao } from "./formulario";

export const metadata = { title: "Medições" };
export const dynamic = "force-dynamic";

/**
 * Aba Medições — a faixa de indicadores e a tabela do mockup.
 *
 * Nenhum dos quatro números da faixa é coluna no banco: todos saem de
 * `resumoDaObra`, a mesma função que alimenta o painel. Guardar total medido
 * numa coluna criaria a chance de a soma da tela discordar da soma da lista
 * logo abaixo dela.
 */
export default async function MedicoesPage({
  params,
  searchParams,
}: PageProps<"/obras/[id]/medicoes">) {
  const usuario = await exigirPermissao("medicao", "ver");
  const { id } = await params;
  const parametros = await searchParams;
  const { salva } = parametros;
  const filtros = lerFiltrosMedicao(parametros);

  const podeEditar = pode(usuario.perfil, "medicao", "editar");
  const podeExcluir = pode(usuario.perfil, "medicao", "excluir");

  const [obra, medicoes, documentos] = await Promise.all([
    carregarObra(id),
    carregarMedicoes(id),
    // Só quem exclui precisa saber quais medições têm documento ativo: é o
    // que decide se a confirmação oferece o botão ou explica a trava.
    podeExcluir ? carregarDocumentos(id) : [],
  ]);
  if (!obra) notFound();

  const agora = new Date();
  const { financeiro, medicao } = resumoDaObra(obra, obra.medicoes, agora);
  const estourou = financeiro.saldoAMedir.isNegative();
  const documentosPorMedicao = contarDocumentosPorMedicao(documentos);

  // A faixa de indicadores continua falando da obra inteira; só a tabela
  // responde ao filtro. Um total que mudasse junto com o filtro deixaria de
  // ser o valor do contrato.
  const visiveis = filtrarMedicoes(medicoes, filtros);
  const pendentes = medicoes.filter((m) => pagamentoPendente(m.status));
  const valorPendente = somar(...pendentes.map((m) => m.valorMedido));

  return (
    <div className="flex flex-col gap-4">
      {salva && <Alerta tipo="sucesso">Medição salva.</Alerta>}

      {estourou && (
        <Alerta tipo="erro">
          O total medido passou o valor contratado em{" "}
          {formatarBRL(financeiro.saldoAMedir.negated())}. Se houve aditivo,
          registre-o na aba Rerratificações para o contrato atual refletir o
          novo valor.
        </Alerta>
      )}

      <Card
        titulo="Medições"
        acao={
          pode(usuario.perfil, "medicao", "criar") && (
            <Link
              href={`/obras/${obra.id}/medicoes/nova`}
              className="rounded-lg bg-[var(--accent)] px-3.5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--accent-hover)]"
            >
              Nova medição
            </Link>
          )
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Dado rotulo="Valor contratado">
            <span className="tabular">
              {formatarBRL(financeiro.valorContratadoAtual)}
            </span>
          </Dado>
          <Dado rotulo="Total medido">
            <span className="tabular">
              {formatarBRL(financeiro.valorMedidoTotal)}
            </span>
          </Dado>
          <Dado rotulo="% medido">
            {formatarPercentual(financeiro.percentualMedido)}
          </Dado>
          <Dado rotulo="Saldo a medir">
            <span className="tabular">{formatarBRL(financeiro.saldoAMedir)}</span>
          </Dado>
        </div>

        <div className="mt-4 grid gap-3 border-t border-[var(--border)] pt-4 sm:grid-cols-4">
          <Dado rotulo="Pagamento pendente">
            {pendentes.length === 0 ? (
              "Nada pendente"
            ) : (
              <span className="tabular text-[var(--danger)]">
                {formatarBRL(valorPendente)}
              </span>
            )}
          </Dado>
          <Dado rotulo="Última medição">
            {formatarData(medicao?.ultima)}
          </Dado>
          <Dado rotulo="Próxima medição">
            {medicao ? formatarData(medicao.proxima) : "—"}
          </Dado>
          <Dado rotulo="Situação do ciclo">
            {medicao ? (
              medicao.atrasada ? (
                <span className="text-[var(--danger)]">
                  Vencida há {Math.abs(medicao.diasRestantes)} dia(s)
                </span>
              ) : (
                `Faltam ${medicao.diasRestantes} dia(s)`
              )
            ) : (
              "—"
            )}
          </Dado>
        </div>
      </Card>

      <Card
        titulo={
          temFiltroMedicao(filtros)
            ? `Histórico (${visiveis.length} de ${medicoes.length})`
            : `Histórico (${medicoes.length})`
        }
      >
        <div className="mb-4 border-b border-[var(--border)] pb-4">
          <FiltrosDasMedicoes
            base={`/obras/${obra.id}/medicoes`}
            filtros={filtros}
          />
        </div>

        {visiveis.length === 0 ? (
          <Vazio
            mensagem={
              temFiltroMedicao(filtros)
                ? "Nenhuma medição com esses filtros."
                : "Nenhuma medição lançada nesta obra."
            }
          />
        ) : (
          <Tabela
            colunas={[
              "Nº",
              "Competência",
              "Período",
              "Data",
              "Valor",
              "Protocolo",
              "NF",
              "ISS",
              "Responsável",
              "Situação",
              "Docs",
              ...(podeExcluir ? [""] : []),
            ]}
          >
            {visiveis.map((m) => (
              <Linha key={m.id}>
                <Celula>
                  {podeEditar ? (
                    <Link
                      href={`/obras/${obra.id}/medicoes/${m.id}`}
                      className="font-bold text-[var(--primary)] underline underline-offset-2"
                    >
                      {String(m.numero).padStart(2, "0")}
                    </Link>
                  ) : (
                    <strong>{String(m.numero).padStart(2, "0")}</strong>
                  )}
                </Celula>
                <Celula>{formatarCompetencia(m.competencia)}</Celula>
                <Celula apagada>
                  {m.periodoInicio && m.periodoFim
                    ? `${formatarData(m.periodoInicio)} a ${formatarData(m.periodoFim)}`
                    : "—"}
                </Celula>
                <Celula>{formatarData(m.dataMedicao)}</Celula>
                <Celula tabular>{formatarBRL(m.valorMedido)}</Celula>
                <Celula apagada>{m.protocolo ?? "—"}</Celula>
                <Celula apagada>{m.notaFiscalNumero ?? "—"}</Celula>
                <Celula tabular apagada>
                  {m.issValor ? formatarBRL(m.issValor) : "—"}
                </Celula>
                <Celula apagada>{m.responsavelNome ?? "—"}</Celula>
                <Celula>
                  <BadgeMedicao status={m.status} />
                </Celula>
                <Celula tabular apagada>
                  {m._count.documentos}
                </Celula>
                {podeExcluir && (
                  <Celula>
                    <BotaoExcluirMedicao
                      medicao={medicaoParaExcluir(m, documentosPorMedicao)}
                      gatilho="link"
                    />
                  </Celula>
                )}
              </Linha>
            ))}
          </Tabela>
        )}
      </Card>
    </div>
  );
}
