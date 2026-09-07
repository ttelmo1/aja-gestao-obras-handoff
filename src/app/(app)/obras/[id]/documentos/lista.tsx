import { Celula, Linha, Tabela } from "@/components/ui/tabela";
import { Vazio } from "@/components/ui/vazio";
import { formatarData } from "@/lib/date-br";
import { origemDoDocumento } from "@/modules/documentos/origem";
import {
  formatarTamanho,
  ROTULOS_TIPO_DOCUMENTO,
} from "@/modules/documentos/rotulos";

import type { DocumentoCarregado } from "../dados";
import { BotaoExcluirDocumento } from "./excluir";

/**
 * Tabela da central de documentos — as colunas do mockup: Tipo, Documento,
 * Vinculado a, Setor / Etapa, Data, Incluído por, Observação, Ação.
 *
 * `mostrarOrigem` fica desligado nos blocos dentro de uma medição ou de um
 * setor: ali a origem é o próprio contexto da tela, e repetir "Medição 05" em
 * toda linha é ruído.
 */
export function ListaDocumentos({
  documentos,
  podeExcluir,
  mostrarOrigem = true,
  vazio = "Nenhum documento enviado.",
}: {
  documentos: DocumentoCarregado[];
  podeExcluir: boolean;
  mostrarOrigem?: boolean;
  vazio?: string;
}) {
  if (documentos.length === 0) return <Vazio mensagem={vazio} />;

  const colunas = [
    "Tipo",
    "Documento",
    ...(mostrarOrigem ? ["Vinculado a", "Setor / Etapa"] : []),
    "Data",
    "Incluído por",
    "Observação",
    "Ação",
    ...(podeExcluir ? [""] : []),
  ];

  return (
    <Tabela colunas={colunas}>
      {documentos.map((d) => {
        const origem = origemDoDocumento(d);
        return (
          <Linha key={d.id}>
            <Celula>{ROTULOS_TIPO_DOCUMENTO[d.tipo]}</Celula>
            <Celula>
              <strong>{d.nomeOriginal}</strong>
              <span className="block text-xs text-[var(--muted)]">
                {formatarTamanho(d.tamanhoBytes)}
              </span>
            </Celula>
            {mostrarOrigem && (
              <>
                <Celula>{origem.rotulo}</Celula>
                <Celula apagada>{origem.setorOuEtapa ?? "—"}</Celula>
              </>
            )}
            <Celula>{formatarData(d.criadoEm)}</Celula>
            <Celula apagada>{d.enviadoPor?.nome ?? "—"}</Celula>
            <Celula apagada>{d.descricao ?? "—"}</Celula>
            <Celula>
              <a
                href={`/documentos/${d.id}`}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-[var(--primary)] underline underline-offset-2"
              >
                Abrir
              </a>
            </Celula>
            {podeExcluir && (
              <Celula>
                <BotaoExcluirDocumento documentoId={d.id} />
              </Celula>
            )}
          </Linha>
        );
      })}
    </Tabela>
  );
}
