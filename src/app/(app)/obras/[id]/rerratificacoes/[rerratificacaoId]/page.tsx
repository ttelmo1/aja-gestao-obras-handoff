import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { exigirPermissao } from "@/lib/guarda";
import { paraCampoDinheiro } from "@/lib/money";
import { pode } from "@/modules/auth/permissoes";

import {
  carregarDocumentos,
  carregarObra,
  carregarRerratificacoes,
  paraCampoData,
} from "../../dados";
import { EnviarDocumentos } from "../../documentos/enviar";
import { ListaDocumentos } from "../../documentos/lista";
import {
  BotaoExcluirRerratificacao,
  FormularioRerratificacao,
} from "../formulario";

export const metadata = { title: "Rerratificação" };
export const dynamic = "force-dynamic";

export default async function EditarRerratificacaoPage({
  params,
}: PageProps<"/obras/[id]/rerratificacoes/[rerratificacaoId]">) {
  const usuario = await exigirPermissao("rerratificacao", "editar");
  const { id, rerratificacaoId } = await params;

  const [obra, rerratificacoes, documentos] = await Promise.all([
    carregarObra(id),
    carregarRerratificacoes(id),
    carregarDocumentos(id),
  ]);
  if (!obra) notFound();

  const r = rerratificacoes.find((x) => x.id === rerratificacaoId);
  if (!r) notFound();

  const anexos = documentos.filter((d) => d.rerratificacaoId === r.id);

  return (
    <div className="flex flex-col gap-4">
      <Card
        titulo={`Rerratificação nº ${String(r.numero).padStart(2, "0")}${
          r.protocolo ? ` · Protocolo ${r.protocolo}` : ""
        }`}
      >
        <FormularioRerratificacao
          obraId={obra.id}
          numeroSugerido={r.numero}
          padrao={{
            id: r.id,
            numero: r.numero,
            data: paraCampoData(r.data),
            protocolo: r.protocolo,
            descricao: r.descricao,
            quantidadeItens: r.quantidadeItens,
            percentualAlcancado: r.percentualAlcancado
              .toFixed(2)
              .replace(".", ","),
            valorImpactado: paraCampoDinheiro(r.valorImpactado) ?? "",
            prazoAdicionalDias: r.prazoAdicionalDias,
            status: r.status,
            observacoes: r.observacoes,
          }}
        />
      </Card>

      <Card titulo={`Documentos da rerratificação (${anexos.length})`}>
        <p className="mb-4 text-sm text-[var(--muted)]">
          É aqui que entra a <strong>planilha Excel</strong> apresentada ao
          órgão — ela é o detalhamento item a item que o sistema não duplica
          (requisitos 1.7). Pareceres e demais anexos também.
        </p>

        <ListaDocumentos
          documentos={anexos}
          podeExcluir={pode(usuario.perfil, "documento", "excluir")}
          mostrarOrigem={false}
          vazio="Nenhum documento anexado a esta rerratificação."
        />

        {pode(usuario.perfil, "documento", "criar") && (
          <div className="mt-5 border-t border-[var(--border)] pt-5">
            <EnviarDocumentos
              obraId={obra.id}
              contexto="rerratificacao"
              rerratificacaoId={r.id}
              titulo="Anexar planilha, parecer ou outro documento"
            />
          </div>
        )}
      </Card>

      {pode(usuario.perfil, "rerratificacao", "excluir") && (
        <Card titulo="Excluir rerratificação">
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-[var(--muted)]">
              Só rerratificação em elaboração pode ser apagada. Depois de
              protocolada, o caminho é marcá-la como <strong>Rejeitada</strong>{" "}
              — o processo já existe no órgão.
            </p>
            <BotaoExcluirRerratificacao id={r.id} />
          </div>
        </Card>
      )}
    </div>
  );
}
