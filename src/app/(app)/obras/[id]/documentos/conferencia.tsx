"use client";

import { useEnvioSemReset } from "@/components/ui/envio-sem-reset";
import { Alerta, Botao, classeInput } from "@/components/ui/formulario";
import { Celula, Linha, Tabela } from "@/components/ui/tabela";
import { formatarData } from "@/lib/date-br";
import type { LinhaConferencia } from "@/modules/documentos/conferencia";
import { ROTULOS_TIPO_DOCUMENTO } from "@/modules/documentos/rotulos";

import {
  dispensarDocumento,
  exigirDocumento,
  type EstadoDocumento,
} from "./acoes";

/**
 * Lista de conferência: o que se espera da obra (ou da medição), com o que
 * falta em vermelho.
 *
 * Substitui a leitura que a aba Tramitação dava — pedido do Junior em
 * 17/09/2026. O que ela diz é "falta anexar o aceite"; o que ela não diz é
 * "o processo está há 12 dias na Controladoria", e a data mostrada é a do
 * upload, não a do fato.
 */
export function ConferenciaDocumentos({
  obraId,
  medicaoId,
  linhas,
  podeEditar,
}: {
  obraId: string;
  medicaoId?: string;
  linhas: LinhaConferencia[];
  podeEditar: boolean;
}) {
  const [estado, aoEnviar, pendente] = useEnvioSemReset<EstadoDocumento>(
    async (_anterior, dados) =>
      dados.get("acao") === "exigir"
        ? exigirDocumento(undefined, dados)
        : dispensarDocumento(undefined, dados),
    undefined,
  );

  return (
    <form onSubmit={aoEnviar} className="flex flex-col gap-3">
      <input type="hidden" name="obraId" value={obraId} />
      {medicaoId && <input type="hidden" name="medicaoId" value={medicaoId} />}
      {/*
        Qual linha foi clicada vai por campo oculto, preenchido no clique, e
        não pelo `name`/`value` do botão: o envio monta o `FormData` a partir
        do formulário, e o par do botão que submeteu só entra quando o
        `FormData` é construído com o submitter — que este caminho não tem.
      */}
      <input type="hidden" name="tipo" defaultValue="" />
      <input type="hidden" name="acao" defaultValue="dispensar" />

      <Tabela
        colunas={[
          "Documento",
          "Situação",
          "Arquivos",
          "Último envio",
          ...(podeEditar ? [""] : []),
        ]}
      >
        {linhas.map((l) => (
          <Linha key={l.tipo}>
            <Celula>
              <strong
                className={
                  l.situacao === "DISPENSADO" ? "text-[var(--muted)]" : undefined
                }
              >
                {ROTULOS_TIPO_DOCUMENTO[l.tipo]}
              </strong>
              {l.foraDaLista && (
                <span className="ml-2 text-[11px] text-[var(--muted)]">
                  fora da lista
                </span>
              )}
            </Celula>

            <Celula>
              <SituacaoDaLinha linha={l} />
            </Celula>

            <Celula tabular apagada>
              {l.quantidade > 0 ? l.quantidade : "—"}
            </Celula>

            <Celula apagada>
              {l.ultimoEnvio ? formatarData(l.ultimoEnvio) : "—"}
            </Celula>

            {podeEditar && (
              <Celula>
                {l.situacao === "DISPENSADO" ? (
                  <BotaoDaLinha
                    tipo={l.tipo}
                    acao="exigir"
                    rotulo="Voltar a exigir"
                    pendente={pendente}
                  />
                ) : (
                  <BotaoDaLinha
                    tipo={l.tipo}
                    acao="dispensar"
                    rotulo="Não se aplica"
                    pendente={pendente}
                  />
                )}
              </Celula>
            )}
          </Linha>
        ))}
      </Tabela>

      {podeEditar && (
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`motivo-dispensa-${medicaoId ?? obraId}`}
            className="text-[11px] font-bold tracking-wide text-[var(--muted)] uppercase"
          >
            Motivo da dispensa (opcional)
          </label>
          <input
            id={`motivo-dispensa-${medicaoId ?? obraId}`}
            name="motivo"
            placeholder="Ex.: contrato sem exigência de garantia"
            className={classeInput}
          />
          <p className="text-[12px] text-[var(--muted)]">
            Preenchido antes de clicar em &ldquo;Não se aplica&rdquo;, fica
            gravado junto com a dispensa e aparece na lista.
          </p>
        </div>
      )}

      {estado?.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      {estado?.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}
    </form>
  );
}

function SituacaoDaLinha({ linha }: { linha: LinhaConferencia }) {
  if (linha.situacao === "DISPENSADO") {
    return (
      <span className="text-[var(--muted)]">
        Não se aplica
        {linha.motivo && ` · ${linha.motivo}`}
      </span>
    );
  }
  if (linha.situacao === "ANEXADO") {
    return <span className="text-[var(--success)]">Anexado</span>;
  }
  return <strong className="text-[var(--danger)]">Não anexado</strong>;
}

/**
 * Os botões são `submit` do mesmo formulário, e não formulários próprios: um
 * `<form>` por linha não pode existir dentro de `<table>` sem quebrar o HTML,
 * e o campo de motivo precisa ser lido por qualquer um deles.
 */
function BotaoDaLinha({
  tipo,
  acao,
  rotulo,
  pendente,
}: {
  tipo: string;
  acao: "dispensar" | "exigir";
  rotulo: string;
  pendente: boolean;
}) {
  return (
    <Botao
      type="submit"
      variante="secundario"
      disabled={pendente}
      onClick={(e) => {
        const form = e.currentTarget.form;
        if (!form) return;
        (form.elements.namedItem("tipo") as HTMLInputElement).value = tipo;
        (form.elements.namedItem("acao") as HTMLInputElement).value = acao;
      }}
    >
      {rotulo}
    </Botao>
  );
}
