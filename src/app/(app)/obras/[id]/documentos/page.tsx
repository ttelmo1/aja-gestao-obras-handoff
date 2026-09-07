import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Dado } from "@/components/ui/dados";
import { exigirPermissao } from "@/lib/guarda";
import { pode } from "@/modules/auth/permissoes";
import {
  filtrarPorOrigem,
  lerFiltrosDocumento,
  temFiltroDocumento,
} from "@/modules/documentos/filtros";
import { origensDisponiveis } from "@/modules/documentos/origem";
import { formatarTamanho, TIPOS_DOCUMENTO } from "@/modules/documentos/rotulos";

import { carregarDocumentos, carregarObra } from "../dados";
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

  const [obra, todos] = await Promise.all([
    carregarObra(id),
    carregarDocumentos(id),
  ]);
  if (!obra) notFound();

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
