"use client";

import Link from "next/link";

import { ConfirmarExclusao } from "@/components/ui/confirmar-exclusao";
import { useEnvioSemReset } from "@/components/ui/envio-sem-reset";
import { Alerta, Botao, Campo, classeInput } from "@/components/ui/formulario";
import type { StatusMedicao } from "@/generated/prisma/enums";
import { bloqueioExclusaoMedicao } from "@/modules/medicoes/exclusao";
import {
  ROTULOS_STATUS_MEDICAO,
  STATUS_MEDICAO,
} from "@/modules/medicoes/rotulos";

import { excluirMedicao, salvarMedicao, type EstadoMedicao } from "./acoes";

export type MedicaoNoFormulario = {
  id: string;
  numero: number;
  competencia: string;
  dataMedicao: string | null;
  periodoInicio: string | null;
  periodoFim: string | null;
  valorMedido: string;
  protocolo: string | null;
  dataProtocolo: string | null;
  notaFiscalNumero: string | null;
  notaFiscalData: string | null;
  notaFiscalValor: string | null;
  issAliquota: string | null;
  issValor: string | null;
  responsavelNome: string | null;
  status: StatusMedicao;
  dataPagamento: string | null;
  observacoes: string | null;
};

/**
 * Formulário da medição, em três blocos: o que foi medido, o protocolo no
 * órgão e a parte fiscal. É a ordem em que o processo acontece na vida real,
 * e a mesma do detalhe de medição do mockup.
 */
export function FormularioMedicao({
  obraId,
  padrao,
  numeroSugerido,
  competenciaSugerida,
}: {
  obraId: string;
  padrao?: MedicaoNoFormulario;
  numeroSugerido: number;
  competenciaSugerida: string;
}) {
  const [estado, aoEnviar, pendente] = useEnvioSemReset<EstadoMedicao>(
    salvarMedicao,
    undefined,
  );

  return (
    <form onSubmit={aoEnviar} className="flex flex-col gap-5">
      <input type="hidden" name="obraId" value={obraId} />
      {padrao && <input type="hidden" name="id" value={padrao.id} />}

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-[11px] font-bold tracking-wide text-[var(--muted)] uppercase">
          Medição
        </legend>

        <div className="grid gap-4 sm:grid-cols-3">
          <Campo id="numero" rotulo="Número">
            <input
              id="numero"
              name="numero"
              type="number"
              min={1}
              required
              defaultValue={padrao?.numero ?? numeroSugerido}
              className={`${classeInput} tabular`}
            />
          </Campo>

          <Campo id="competencia" rotulo="Competência">
            <input
              id="competencia"
              name="competencia"
              type="month"
              required
              defaultValue={padrao?.competencia ?? competenciaSugerida}
              className={classeInput}
            />
          </Campo>

          <Campo
            id="dataMedicao"
            rotulo="Data da medição"
            dica="Data do boletim. É por ela que a próxima medição é contada."
          >
            <input
              id="dataMedicao"
              name="dataMedicao"
              type="date"
              defaultValue={padrao?.dataMedicao ?? ""}
              className={classeInput}
            />
          </Campo>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="periodoInicio" rotulo="Período — início">
            <input
              id="periodoInicio"
              name="periodoInicio"
              type="date"
              defaultValue={padrao?.periodoInicio ?? ""}
              className={classeInput}
            />
          </Campo>

          <Campo id="periodoFim" rotulo="Período — fim">
            <input
              id="periodoFim"
              name="periodoFim"
              type="date"
              defaultValue={padrao?.periodoFim ?? ""}
              className={classeInput}
            />
          </Campo>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Campo id="valorMedido" rotulo="Valor medido (R$)">
            <input
              id="valorMedido"
              name="valorMedido"
              required
              inputMode="decimal"
              defaultValue={padrao?.valorMedido}
              placeholder="219.000,00"
              className={`${classeInput} tabular`}
            />
          </Campo>

          {/*
            Nome digitado, não escolhido: o cadastro de responsáveis saiu em
            21/09/2026 a pedido da Fernanda — "pode deixar só pra colocar o
            nome do responsável pela medição mesmo".
          */}
          <Campo id="responsavelNome" rotulo="Responsável pela medição">
            <input
              id="responsavelNome"
              name="responsavelNome"
              defaultValue={padrao?.responsavelNome ?? ""}
              className={classeInput}
            />
          </Campo>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-t border-[var(--border)] pt-5">
        <legend className="mb-2 text-[11px] font-bold tracking-wide text-[var(--muted)] uppercase">
          Protocolo e situação
        </legend>

        <div className="grid gap-4 sm:grid-cols-3">
          {/*
            "Paga" não se escolhe aqui: o pagamento é marcado pelo botão na
            lista de medições, que grava a data junto (24/09/2026). Medição já
            paga mostra a situação fixa e leva o valor num campo oculto.
          */}
          {padrao?.status === "PAGA" ? (
            <Campo
              id="status"
              rotulo="Situação"
              dica="Para mudar, desfaça o pagamento na lista de medições."
            >
              <input type="hidden" name="status" value="PAGA" />
              <p id="status" className="py-2.5 text-sm font-bold text-[var(--success)]">
                Paga{padrao.dataPagamento && ` em ${formatarDataCampo(padrao.dataPagamento)}`}
              </p>
            </Campo>
          ) : (
            <Campo id="status" rotulo="Situação">
              <select
                id="status"
                name="status"
                defaultValue={padrao?.status ?? "RASCUNHO"}
                className={classeInput}
              >
                {STATUS_MEDICAO.filter((s) => s !== "PAGA").map((s) => (
                  <option key={s} value={s}>
                    {ROTULOS_STATUS_MEDICAO[s]}
                  </option>
                ))}
              </select>
            </Campo>
          )}

          <Campo id="protocolo" rotulo="Nº do protocolo">
            <input
              id="protocolo"
              name="protocolo"
              defaultValue={padrao?.protocolo ?? ""}
              placeholder="2026.004581"
              className={classeInput}
            />
          </Campo>

          <Campo id="dataProtocolo" rotulo="Data do protocolo">
            <input
              id="dataProtocolo"
              name="dataProtocolo"
              type="date"
              defaultValue={padrao?.dataProtocolo ?? ""}
              className={classeInput}
            />
          </Campo>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-t border-[var(--border)] pt-5">
        <legend className="mb-2 text-[11px] font-bold tracking-wide text-[var(--muted)] uppercase">
          Nota fiscal e ISS
        </legend>

        <div className="grid gap-4 sm:grid-cols-3">
          <Campo id="notaFiscalNumero" rotulo="Nº da nota fiscal">
            <input
              id="notaFiscalNumero"
              name="notaFiscalNumero"
              defaultValue={padrao?.notaFiscalNumero ?? ""}
              placeholder="1847"
              className={classeInput}
            />
          </Campo>

          <Campo id="notaFiscalData" rotulo="Data da nota">
            <input
              id="notaFiscalData"
              name="notaFiscalData"
              type="date"
              defaultValue={padrao?.notaFiscalData ?? ""}
              className={classeInput}
            />
          </Campo>

          <Campo id="notaFiscalValor" rotulo="Valor da nota (R$)">
            <input
              id="notaFiscalValor"
              name="notaFiscalValor"
              inputMode="decimal"
              defaultValue={padrao?.notaFiscalValor ?? ""}
              className={`${classeInput} tabular`}
            />
          </Campo>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="issAliquota" rotulo="Alíquota do ISS (%)">
            <input
              id="issAliquota"
              name="issAliquota"
              inputMode="decimal"
              defaultValue={padrao?.issAliquota ?? ""}
              placeholder="5,00"
              className={`${classeInput} tabular`}
            />
          </Campo>

          <Campo
            id="issValor"
            rotulo="Valor do ISS (R$)"
            dica="Em branco, o sistema calcula pela alíquota sobre o valor da nota."
          >
            <input
              id="issValor"
              name="issValor"
              inputMode="decimal"
              defaultValue={padrao?.issValor ?? ""}
              className={`${classeInput} tabular`}
            />
          </Campo>
        </div>

        <Campo id="observacoes" rotulo="Observações da medição">
          <textarea
            id="observacoes"
            name="observacoes"
            rows={3}
            defaultValue={padrao?.observacoes ?? ""}
            className={`${classeInput} min-h-24`}
          />
        </Campo>
      </fieldset>

      {estado?.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      {estado?.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}

      <div className="flex items-center gap-3">
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : padrao ? "Salvar alterações" : "Lançar medição"}
        </Botao>
        <Link
          href={`/obras/${obraId}/medicoes`}
          className="text-sm text-[var(--muted)] underline underline-offset-2"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

/** "2026-09-24" do campo de data vira "24/09/2026". */
function formatarDataCampo(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** O que a janela de confirmação mostra, já formatado no servidor. */
export type MedicaoParaExcluir = {
  id: string;
  numero: string;
  competencia: string;
  valor: string;
  situacao: string;
  protocolo: string | null;
  documentosAtivos: number;
};

/**
 * Excluir medição — só aparece para quem tem a permissão. Como link na linha
 * da tabela e como botão no detalhe; nos dois, a confirmação mostra qual
 * medição vai sair.
 */
export function BotaoExcluirMedicao({
  medicao,
  gatilho,
}: {
  medicao: MedicaoParaExcluir;
  gatilho: "link" | "botao";
}) {
  return (
    <ConfirmarExclusao
      acao={excluirMedicao}
      campos={{ id: medicao.id }}
      titulo={`Excluir a medição ${medicao.numero}?`}
      detalhes={[
        { rotulo: "Competência", valor: medicao.competencia },
        { rotulo: "Valor medido", valor: medicao.valor },
        { rotulo: "Situação", valor: medicao.situacao },
        { rotulo: "Protocolo", valor: medicao.protocolo ?? "—" },
      ]}
      bloqueio={bloqueioExclusaoMedicao(medicao.documentosAtivos)}
      aviso="A medição e a tramitação dela são apagadas de vez. A auditoria continua registrando a exclusão."
      gatilho={gatilho}
      rotuloGatilho={gatilho === "link" ? "Excluir" : "Excluir medição"}
    />
  );
}
