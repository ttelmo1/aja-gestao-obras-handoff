import { Celula, Linha, Tabela } from "@/components/ui/tabela";
import { Vazio } from "@/components/ui/vazio";
import { formatarData } from "@/lib/date-br";
import { ehOpcional, type LinhaAcervo } from "@/modules/documentos/acervo";
import { origemDoDocumento } from "@/modules/documentos/origem";
import {
  formatarTamanho,
  ROTULOS_TIPO_DOCUMENTO,
} from "@/modules/documentos/rotulos";

import type { DocumentoCarregado } from "../dados";
import {
  DispensarDocumento,
  ExigirDocumento,
  IncluirDocumento,
} from "./acoes-linha";
import { BotaoExcluirDocumento } from "./excluir";

/**
 * A lista de documentos, numa tabela só — a mesma na aba da obra e na tela da
 * medição.
 *
 * Substitui os blocos separados de antes: conferência do que se espera, lista
 * do que existe e formulário de envio no fim da página. O que se espera e o
 * que existe passam a ser a mesma linha, e o envio sai da linha, pela coluna
 * "Ação", já sabendo de que tipo é o arquivo.
 *
 * `mostrarOrigem` fica desligado na medição: ali toda linha é da própria
 * medição, e repetir "Medição 05" em cada uma é ruído.
 */
export function AcervoDeDocumentos({
  obraId,
  medicaoId,
  linhas,
  podeIncluir,
  podeDispensar,
  podeExcluir,
  mostrarOrigem = true,
  vazio,
}: {
  obraId: string;
  medicaoId?: string;
  linhas: Array<LinhaAcervo<DocumentoCarregado>>;
  podeIncluir: boolean;
  podeDispensar: boolean;
  podeExcluir: boolean;
  mostrarOrigem?: boolean;
  vazio: string;
}) {
  if (linhas.length === 0) return <Vazio mensagem={vazio} />;

  return (
    <Tabela
      colunas={[
        "Tipo",
        "Documento",
        "Situação",
        ...(mostrarOrigem ? ["Vinculado a"] : []),
        "Data",
        "Incluído por",
        "Observação",
        "Ação",
      ]}
    >
      {linhas.map((l) => {
        const d = l.documento;
        const origem = d ? origemDoDocumento(d) : null;
        const cinza = l.situacao === "DISPENSADO";

        return (
          <Linha key={l.chave}>
            <Celula apagada={cinza}>
              <strong>{ROTULOS_TIPO_DOCUMENTO[l.tipo]}</strong>
              {l.classe !== "ESPERADO" && (
                <span className="block text-[11px] text-[var(--muted)]">
                  {l.classe === "OUTRA_TELA" ? "de outra tela" : "fora da lista"}
                </span>
              )}
            </Celula>

            <Celula apagada={!d}>
              {d ? (
                <>
                  <strong>{d.nomeOriginal}</strong>
                  <span className="block text-xs text-[var(--muted)]">
                    {formatarTamanho(d.tamanhoBytes)}
                  </span>
                </>
              ) : (
                "—"
              )}
            </Celula>

            <Celula>
              <SituacaoDaLinha linha={l} />
            </Celula>

            {mostrarOrigem && (
              <Celula apagada={!origem}>
                {origem ? (
                  <>
                    {origem.rotulo}
                    {origem.setorOuEtapa && (
                      <span className="block text-xs text-[var(--muted)]">
                        {origem.setorOuEtapa}
                      </span>
                    )}
                  </>
                ) : (
                  "Contrato"
                )}
              </Celula>
            )}

            <Celula apagada>{d ? formatarData(d.criadoEm) : "—"}</Celula>
            <Celula apagada>{d?.enviadoPor?.nome ?? "—"}</Celula>
            <Celula apagada>{d?.descricao ?? "—"}</Celula>

            <Celula>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {d && (
                  <a
                    href={`/documentos/${d.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-bold text-[var(--primary)] underline underline-offset-2"
                  >
                    Abrir
                  </a>
                )}

                {podeIncluir && l.aceitaInclusao && (
                  <IncluirDocumento
                    obraId={obraId}
                    medicaoId={medicaoId}
                    tipo={l.tipo}
                  />
                )}

                {podeDispensar &&
                  l.classe !== "OUTRA_TELA" &&
                  (l.situacao === "DISPENSADO" ? (
                    <ExigirDocumento
                      obraId={obraId}
                      medicaoId={medicaoId}
                      tipo={l.tipo}
                    />
                  ) : (
                    // Tipo opcional não se dispensa: "Outros" é a linha por
                    // onde entra o que não tem tipo próprio, e o aditivo e o
                    // apostilamento o cliente já pediu "em caso de
                    // necessidade" — nenhum dos três é cobrado.
                    !d &&
                    !ehOpcional(l.tipo) && (
                      <DispensarDocumento
                        obraId={obraId}
                        medicaoId={medicaoId}
                        tipo={l.tipo}
                      />
                    )
                  ))}

                {podeExcluir && d && <BotaoExcluirDocumento documentoId={d.id} />}
              </div>
            </Celula>
          </Linha>
        );
      })}
    </Tabela>
  );
}

function SituacaoDaLinha({ linha }: { linha: LinhaAcervo<unknown> }) {
  if (linha.situacao === "DISPENSADO") {
    return (
      <span className="text-[var(--muted)]">
        Não se aplica
        {linha.motivo && ` · ${linha.motivo}`}
      </span>
    );
  }
  if (linha.situacao === "ANEXADO") {
    return <span className="whitespace-nowrap text-[var(--success)]">Anexado</span>;
  }
  // Linha opcional vazia não é pendência: "Outros" é por onde entra o que não
  // tem tipo próprio, e aditivo e apostilamento só existem "em caso de
  // necessidade". Vermelho ali seria cobrança que nunca fecha.
  if (ehOpcional(linha.tipo)) {
    return <span className="whitespace-nowrap text-[var(--muted)]">Opcional</span>;
  }
  return <strong className="whitespace-nowrap text-[var(--danger)]">Não anexado</strong>;
}
