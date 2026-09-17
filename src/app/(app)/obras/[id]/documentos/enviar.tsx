"use client";

import { useEnvioSemReset } from "@/components/ui/envio-sem-reset";
import { Alerta, Botao, Campo, classeInput } from "@/components/ui/formulario";
import type { TipoDocumento } from "@/generated/prisma/enums";
import { acceptHtml, TAMANHO_MAXIMO_BYTES } from "@/modules/documentos/formatos";
import {
  ROTULOS_TIPO_DOCUMENTO,
  tiposOrdenados,
  type TIPOS_POR_CONTEXTO,
} from "@/modules/documentos/rotulos";

import { enviarDocumentos, type EstadoDocumento } from "./acoes";

const LIMITE_MB = Math.round(TAMANHO_MAXIMO_BYTES / 1024 / 1024);

/**
 * Bloco de upload, usado em todos os contextos: contrato, medição, etapa e
 * passagem por setor. É o mesmo formulário em todo lugar porque enviar
 * documento é a mesma operação — o que muda é só a que entidade ele fica
 * preso, e isso vai em campo oculto.
 */
export function EnviarDocumentos({
  obraId,
  contexto,
  medicaoId,
  etapaObraId,
  movimentoId,
  rerratificacaoId,
  titulo,
}: {
  obraId: string;
  contexto: keyof typeof TIPOS_POR_CONTEXTO;
  medicaoId?: string;
  etapaObraId?: string;
  movimentoId?: string;
  rerratificacaoId?: string;
  titulo?: string;
}) {
  const [estado, aoEnviar, pendente] = useEnvioSemReset<EstadoDocumento>(
    enviarDocumentos,
    undefined,
  );
  const sufixo = movimentoId ?? medicaoId ?? etapaObraId ?? obraId;

  return (
    <form onSubmit={aoEnviar} className="flex flex-col gap-4">
      <input type="hidden" name="obraId" value={obraId} />
      {medicaoId && <input type="hidden" name="medicaoId" value={medicaoId} />}
      {etapaObraId && (
        <input type="hidden" name="etapaObraId" value={etapaObraId} />
      )}
      {movimentoId && <input type="hidden" name="movimentoId" value={movimentoId} />}
      {rerratificacaoId && (
        <input type="hidden" name="rerratificacaoId" value={rerratificacaoId} />
      )}

      {titulo && (
        <p className="text-[13px] font-bold text-[var(--primary)]">{titulo}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id={`tipo-${sufixo}`} rotulo="Tipo do documento">
          <select
            id={`tipo-${sufixo}`}
            name="tipo"
            defaultValue={tiposOrdenados(contexto)[0]}
            className={classeInput}
          >
            {tiposOrdenados(contexto).map((t: TipoDocumento) => (
              <option key={t} value={t}>
                {ROTULOS_TIPO_DOCUMENTO[t]}
              </option>
            ))}
          </select>
        </Campo>

        <Campo id={`descricao-${sufixo}`} rotulo="Descrição">
          <input
            id={`descricao-${sufixo}`}
            name="descricao"
            placeholder="Ex.: liberação da Controladoria"
            className={classeInput}
          />
        </Campo>
      </div>

      <Campo
        id={`arquivos-${sufixo}`}
        rotulo="Arquivo(s)"
        dica={`PDF, XLSX, XLS, CSV, JPG e PNG, até ${LIMITE_MB}MB cada. É possível selecionar mais de um.`}
      >
        <input
          id={`arquivos-${sufixo}`}
          name="arquivos"
          type="file"
          multiple
          required
          accept={acceptHtml()}
          className={`${classeInput} file:mr-3 file:rounded-md file:border-0 file:bg-[var(--primary)] file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-white`}
        />
      </Campo>

      {estado?.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      {estado?.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}

      <div>
        <Botao type="submit" variante="destaque" disabled={pendente}>
          {pendente ? "Enviando…" : "Enviar documento"}
        </Botao>
      </div>
    </form>
  );
}
