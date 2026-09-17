import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Dado } from "@/components/ui/dados";
import { exigirPermissao } from "@/lib/guarda";
import { pode } from "@/modules/auth/permissoes";
import {
  conferenciaDeDocumentos,
  ESPERADOS_DA_OBRA,
  resumoDaConferencia,
} from "@/modules/documentos/conferencia";
import {
  filtrarPorOrigem,
  lerFiltrosDocumento,
  temFiltroDocumento,
} from "@/modules/documentos/filtros";
import { origensDisponiveis } from "@/modules/documentos/origem";
import { formatarTamanho, TIPOS_DOCUMENTO } from "@/modules/documentos/rotulos";

import { carregarDispensas, carregarDocumentos, carregarObra } from "../dados";
import { ConferenciaDocumentos } from "./conferencia";
import { EnviarDocumentos } from "./enviar";
import { FiltrosDaCentral } from "./filtros";
import { ListaDocumentos } from "./lista";

export const metadata = { title: "Documentos" };
export const dynamic = "force-dynamic";

/**
 * Central de Documentos da Obra — a tela do mockup que reúne tudo que foi
 * enviado nas outras abas, com o vínculo de origem preservado.
 *
 * A busca e o filtro de tipo vão ao banco; o de origem é aplicado depois,
 * porque origem não é coluna — é o vínculo mais específico entre quatro.
 */
export default async function DocumentosPage({
  params,
  searchParams,
}: PageProps<"/obras/[id]/documentos">) {
  const usuario = await exigirPermissao("documento", "ver");
  const { id } = await params;
  const filtros = lerFiltrosDocumento(await searchParams);

  const [obra, todos, dispensas] = await Promise.all([
    carregarObra(id),
    carregarDocumentos(id),
    carregarDispensas(id),
  ]);
  if (!obra) notFound();

  // A conferência do contrato só olha o que é do próprio contrato: documento
  // de medição é cobrado na tela da medição, e contá-lo aqui marcaria "Nota
  // fiscal anexada" na obra por causa da nota da medição 3. O anexo de um
  // movimento de tramitação também fica de fora — ele pertence ao percurso de
  // uma medição, e a tramitação saiu da tela em 17/09.
  const conferencia = conferenciaDeDocumentos({
    esperados: ESPERADOS_DA_OBRA,
    documentos: todos.filter((d) => !d.medicaoId && !d.movimentoId),
    dispensados: dispensas.filter((d) => d.medicaoId === null),
  });
  const resumo = resumoDaConferencia(conferencia);

  // As opções do seletor saem do acervo inteiro, não do resultado filtrado:
  // um filtro que apaga as próprias opções trava o usuário na escolha atual.
  const origens = origensDisponiveis(todos);

  const busca = filtros.busca.toLowerCase();
  const visiveis = filtrarPorOrigem(
    todos.filter((d) => {
      if (filtros.tipo && d.tipo !== filtros.tipo) return false;
      if (!busca) return true;
      return (
        d.nomeOriginal.toLowerCase().includes(busca) ||
        (d.descricao?.toLowerCase().includes(busca) ?? false)
      );
    }),
    filtros.origem,
  );

  const espaco = visiveis.reduce((s, d) => s + Number(d.tamanhoBytes), 0);

  return (
    <div className="flex flex-col gap-4">
      <Card titulo="Central de Documentos da Obra">
        <p className="mb-4 rounded-lg border-l-4 border-[var(--gold)] bg-[#fff9ed] p-3 text-[13px]">
          Esta área reúne todos os arquivos enviados nas demais telas. Cada
          documento continua vinculado à origem: contrato, medição, etapa de
          tramitação ou rerratificação.
        </p>

        <FiltrosDaCentral
          base={`/obras/${obra.id}/documentos`}
          filtros={filtros}
          tipos={TIPOS_DOCUMENTO}
          origens={origens}
        />

        <div className="mt-4 grid gap-3 border-t border-[var(--border)] pt-4 sm:grid-cols-3">
          <Dado rotulo="Documentos">{visiveis.length}</Dado>
          <Dado rotulo="No acervo da obra">{todos.length}</Dado>
          <Dado rotulo="Espaço ocupado">
            <span className="tabular">{formatarTamanho(espaco)}</span>
          </Dado>
        </div>
      </Card>

      <Card
        titulo="Conferência do contrato"
        acao={
          <span
            className="text-sm font-bold"
            style={{
              color: resumo.faltando > 0 ? "var(--danger)" : "var(--success)",
            }}
          >
            {resumo.faltando > 0
              ? `${resumo.faltando} de ${resumo.cobrados} não anexado(s)`
              : "Nada em falta"}
          </span>
        }
      >
        <p className="mb-4 text-sm text-[var(--muted)]">
          Em vermelho o que ainda não foi anexado. O que não se aplica a este
          contrato pode ser marcado: fica cinza e desce para o fim da lista.
          Documento de medição é cobrado na tela da própria medição.
        </p>

        <ConferenciaDocumentos
          obraId={obra.id}
          linhas={conferencia}
          podeEditar={pode(usuario.perfil, "documento", "editar")}
        />
      </Card>

      <Card titulo={`Documentos (${visiveis.length})`}>
        <ListaDocumentos
          documentos={visiveis}
          podeExcluir={pode(usuario.perfil, "documento", "excluir")}
          vazio={
            temFiltroDocumento(filtros)
              ? "Nenhum documento encontrado com esses filtros."
              : "Nenhum documento enviado nesta obra ainda."
          }
        />
      </Card>

      {pode(usuario.perfil, "documento", "criar") && (
        <Card titulo="Novo documento do contrato">
          <p className="mb-4 text-sm text-[var(--muted)]">
            Documento enviado aqui fica vinculado ao contrato da obra. Para
            anexar à medição ou a um setor da tramitação, use o bloco de
            documentos dentro da própria tela — assim a origem fica registrada.
          </p>
          <EnviarDocumentos obraId={obra.id} contexto="obra" />
        </Card>
      )}
    </div>
  );
}
