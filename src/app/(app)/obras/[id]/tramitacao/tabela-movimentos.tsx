import { Celula, Linha, Tabela } from "@/components/ui/tabela";
import { Vazio } from "@/components/ui/vazio";
import { formatarData } from "@/lib/date-br";
import { diasNoSetor } from "@/modules/tramitacao/movimentos";

import type { DocumentoCarregado, MovimentoCarregado } from "../dados";
import { BotaoExcluirMovimento, FormSaida } from "./formularios";

/**
 * Percurso do processo pelos setores — a tabela "Ordem / Setor / Entrada /
 * Saída / Tempo" do mockup.
 *
 * O tempo do movimento aberto é calculado na leitura, nunca lido da coluna:
 * `diasPermanencia` só é gravado quando a saída acontece, e um processo
 * parado há 8 dias precisa dizer 9 amanhã sem ninguém tocar em nada.
 */
export function TabelaMovimentos({
  movimentos,
  documentos = [],
  agora,
  hoje,
  podeEditar,
  podeExcluir,
  mostrarMedicao = false,
}: {
  movimentos: MovimentoCarregado[];
  /** Documentos da obra; cada linha mostra os anexos do seu setor. */
  documentos?: DocumentoCarregado[];
  agora: Date;
  /** `yyyy-mm-dd` de hoje, para o campo de data vir preenchido. */
  hoje: string;
  podeEditar: boolean;
  podeExcluir: boolean;
  /** Mostra a coluna "Medição" — só faz sentido na aba Tramitação. */
  mostrarMedicao?: boolean;
}) {
  if (movimentos.length === 0) {
    return <Vazio mensagem="Nenhum movimento registrado nesta etapa." />;
  }

  const colunas = [
    "Ordem",
    ...(mostrarMedicao ? ["Medição"] : []),
    "Setor",
    "Entrada",
    "Saída",
    "Tempo",
    "Documentos",
    "Registrado por",
    "Observações",
    ...(podeExcluir ? [""] : []),
  ];

  return (
    <Tabela colunas={colunas}>
      {movimentos.map((m, i) => {
        const aberto = m.dataSaida === null;
        const dias = diasNoSetor(m, agora);

        return (
          <Linha key={m.id}>
            <Celula tabular>{i + 1}</Celula>
            {mostrarMedicao && (
              <Celula apagada>
                {m.medicao ? `nº ${String(m.medicao.numero).padStart(2, "0")}` : "—"}
              </Celula>
            )}
            <Celula>
              <strong>{m.setorDestino.nome}</strong>
              {m.setorOrigem && (
                <span className="block text-xs text-[var(--muted)]">
                  veio de {m.setorOrigem.nome}
                </span>
              )}
            </Celula>
            <Celula>{formatarData(m.dataEntrada)}</Celula>
            <Celula>
              {m.dataSaida ? (
                formatarData(m.dataSaida)
              ) : podeEditar ? (
                <FormSaida movimentoId={m.id} hoje={hoje} />
              ) : (
                <span className="text-[var(--muted)]">em aberto</span>
              )}
            </Celula>
            <Celula tabular>
              <strong
                style={{
                  color: aberto && dias >= 15 ? "var(--danger)" : undefined,
                }}
              >
                {dias} dia(s)
              </strong>
              {aberto && (
                <span className="block text-xs text-[var(--muted)]">
                  ainda no setor
                </span>
              )}
            </Celula>
            <Celula>
              {(() => {
                const anexos = documentos.filter((d) => d.movimentoId === m.id);
                if (anexos.length === 0)
                  return <span className="text-[var(--muted)]">—</span>;
                return (
                  <span className="flex flex-wrap gap-1">
                    {anexos.map((d) => (
                      <a
                        key={d.id}
                        href={`/documentos/${d.id}`}
                        target="_blank"
                        rel="noreferrer"
                        title={d.nomeOriginal}
                        className="max-w-[140px] truncate rounded-full bg-[var(--background)] px-2 py-0.5 text-[11px] font-bold text-[var(--primary)] underline underline-offset-2"
                      >
                        {d.nomeOriginal}
                      </a>
                    ))}
                  </span>
                );
              })()}
            </Celula>
            <Celula apagada>{m.registradoPor?.nome ?? "—"}</Celula>
            <Celula apagada>{m.observacoes ?? "—"}</Celula>
            {podeExcluir && (
              <Celula>
                <BotaoExcluirMovimento movimentoId={m.id} />
              </Celula>
            )}
          </Linha>
        );
      })}
    </Tabela>
  );
}
