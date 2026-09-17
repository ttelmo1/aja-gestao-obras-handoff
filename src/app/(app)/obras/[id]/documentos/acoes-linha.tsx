"use client";

import { useActionState } from "react";

import { Alerta, Campo, classeInput } from "@/components/ui/formulario";
import { ModalFormulario } from "@/components/ui/modal";
import type { TipoDocumento } from "@/generated/prisma/enums";
import { aceitaMaisDeUm } from "@/modules/documentos/acervo";
import { acceptHtml, TAMANHO_MAXIMO_BYTES } from "@/modules/documentos/formatos";
import {
  ROTULOS_TIPO_DOCUMENTO,
  tiposOrdenados,
  type TIPOS_POR_CONTEXTO,
} from "@/modules/documentos/rotulos";

import {
  dispensarDocumento,
  enviarDocumentos,
  exigirDocumento,
  type EstadoDocumento,
} from "./acoes";

const LIMITE_MB = Math.round(TAMANHO_MAXIMO_BYTES / 1024 / 1024);

/**
 * As ações que moram na coluna "Ação" de cada linha da aba Documentos.
 *
 * Todas partem da linha, e não de um formulário no fim da página: o tipo do
 * documento já está decidido pela linha que se clicou, então a janela não
 * pergunta de novo — mostra qual é e pede só o arquivo.
 */

/**
 * Anexa o arquivo do tipo desta linha.
 *
 * Na medição todo tipo aceita repetição — duas planilhas de memória de cálculo
 * na mesma medição são normais —, e por isso o texto e o `multiple` mudam
 * conforme a tela. No contrato, só o "Outro".
 */
export function IncluirDocumento({
  obraId,
  medicaoId,
  tipo,
}: {
  obraId: string;
  medicaoId?: string;
  tipo: TipoDocumento;
}) {
  const rotulo = ROTULOS_TIPO_DOCUMENTO[tipo];
  const varios = medicaoId !== undefined || aceitaMaisDeUm(tipo);
  const sufixo = `${medicaoId ?? obraId}-${tipo}`;

  return (
    <ModalFormulario
      acao={enviarDocumentos}
      campos={{ obraId, medicaoId, tipo }}
      titulo={`Incluir · ${rotulo}`}
      descricao={
        medicaoId
          ? `O arquivo fica vinculado a esta medição como ${rotulo}. A medição aceita quantos arquivos precisar de cada tipo.`
          : varios
            ? "“Outro” é o tipo que aceita repetição: use-o para o segundo arquivo de um assunto que já tem linha própria."
            : `O arquivo fica vinculado ao contrato da obra como ${rotulo}. Cada tipo entra uma vez — havendo mais de um arquivo do mesmo assunto, envie os demais como “Outro”.`
      }
      rotuloEnvio="Enviar documento"
      rotuloEnviando="Enviando…"
      varianteEnvio="destaque"
      gatilho="Incluir"
    >
      <Campo
        id={`arquivo-${sufixo}`}
        rotulo="Arquivo"
        dica={`PDF, XLSX, XLS, CSV, JPG e PNG, até ${LIMITE_MB}MB.${
          varios ? " É possível selecionar mais de um." : ""
        }`}
      >
        <input
          id={`arquivo-${sufixo}`}
          name="arquivos"
          type="file"
          multiple={varios}
          required
          accept={acceptHtml()}
          className={`${classeInput} file:mr-3 file:rounded-md file:border-0 file:bg-[var(--primary)] file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-white`}
        />
      </Campo>

      <Campo id={`descricao-${sufixo}`} rotulo="Observação (opcional)">
        <input
          id={`descricao-${sufixo}`}
          name="descricao"
          placeholder="Ex.: assinado em 12/03, via protocolo 1234"
          className={classeInput}
        />
      </Campo>
    </ModalFormulario>
  );
}

/**
 * Marca o tipo como "não se aplica" a este contrato.
 *
 * O motivo é opcional mas fica na mesma janela do clique: no formato antigo
 * ele era um campo solto abaixo da tabela, preenchido antes de achar a linha
 * certa — ninguém preenchia.
 */
export function DispensarDocumento({
  obraId,
  medicaoId,
  tipo,
}: {
  obraId: string;
  medicaoId?: string;
  tipo: TipoDocumento;
}) {
  return (
    <ModalFormulario
      acao={dispensarDocumento}
      campos={{ obraId, medicaoId, tipo }}
      titulo={`Não se aplica · ${ROTULOS_TIPO_DOCUMENTO[tipo]}`}
      descricao="O tipo deixa de ser cobrado: fica cinza e desce para o fim da lista. Dá para voltar atrás depois."
      rotuloEnvio="Marcar como não se aplica"
      rotuloEnviando="Marcando…"
      gatilho="Não se aplica"
    >
      <Campo
        id={`motivo-${medicaoId ?? obraId}-${tipo}`}
        rotulo="Motivo (opcional)"
        dica="Fica gravado junto com a dispensa e aparece na lista."
      >
        <input
          id={`motivo-${medicaoId ?? obraId}-${tipo}`}
          name="motivo"
          placeholder="Ex.: contrato sem exigência de garantia"
          className={classeInput}
        />
      </Campo>
    </ModalFormulario>
  );
}

/**
 * Desfaz a dispensa. Sem janela: não há o que preencher nem o que conferir —
 * o tipo volta a ser cobrado e a lista mostra o resultado.
 */
export function ExigirDocumento({
  obraId,
  medicaoId,
  tipo,
}: {
  obraId: string;
  medicaoId?: string;
  tipo: TipoDocumento;
}) {
  const [estado, acao, pendente] = useActionState<EstadoDocumento, FormData>(
    exigirDocumento,
    undefined,
  );

  // `contents` tira o formulário do fluxo: o botão vira item direto da linha
  // de ações e alinha com "Abrir", "Incluir" e "Excluir", em vez de formar uma
  // caixa própria que a coluna centraliza por fora.
  return (
    <form action={acao} className="contents">
      <input type="hidden" name="obraId" value={obraId} />
      {medicaoId && <input type="hidden" name="medicaoId" value={medicaoId} />}
      <input type="hidden" name="tipo" value={tipo} />
      <button
        type="submit"
        disabled={pendente}
        className="text-sm font-bold text-[var(--primary)] underline underline-offset-2 disabled:opacity-60"
      >
        {pendente ? "Voltando…" : "Voltar a exigir"}
      </button>
      {estado?.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
    </form>
  );
}

/**
 * Anexa um documento de tipo fora da lista cobrada pela tela.
 *
 * A lista da medição é curta de propósito — os cinco documentos que o mockup
 * já sugeria ali. Sem esta porta, anexar um parecer ou uma foto à medição
 * ficaria impossível; com ela, o caso raro continua possível sem alongar a
 * lista que o usuário lê todo dia. É a única janela que ainda pergunta o tipo,
 * porque aqui nenhuma linha o decidiu.
 */
export function IncluirDeOutroTipo({
  obraId,
  medicaoId,
  contexto,
  tiposJaListados,
}: {
  obraId: string;
  medicaoId?: string;
  contexto: keyof typeof TIPOS_POR_CONTEXTO;
  /** Os tipos que já têm linha própria — não se repetem no seletor. */
  tiposJaListados: TipoDocumento[];
}) {
  const jaListados = new Set(tiposJaListados);
  const opcoes = tiposOrdenados(contexto).filter((t) => !jaListados.has(t));
  const sufixo = medicaoId ?? obraId;

  return (
    <ModalFormulario
      acao={enviarDocumentos}
      campos={{ obraId, medicaoId }}
      titulo="Incluir documento de outro tipo"
      descricao="Para o que não tem linha própria na lista acima — um parecer, uma foto, uma planilha extra."
      rotuloEnvio="Enviar documento"
      rotuloEnviando="Enviando…"
      varianteEnvio="destaque"
      gatilho="Incluir documento de outro tipo"
    >
      <Campo id={`tipo-livre-${sufixo}`} rotulo="Tipo do documento">
        <select
          id={`tipo-livre-${sufixo}`}
          name="tipo"
          defaultValue={opcoes[0]}
          className={classeInput}
        >
          {opcoes.map((t) => (
            <option key={t} value={t}>
              {ROTULOS_TIPO_DOCUMENTO[t]}
            </option>
          ))}
        </select>
      </Campo>

      <Campo
        id={`arquivo-livre-${sufixo}`}
        rotulo="Arquivo(s)"
        dica={`PDF, XLSX, XLS, CSV, JPG e PNG, até ${LIMITE_MB}MB cada. É possível selecionar mais de um.`}
      >
        <input
          id={`arquivo-livre-${sufixo}`}
          name="arquivos"
          type="file"
          multiple
          required
          accept={acceptHtml()}
          className={`${classeInput} file:mr-3 file:rounded-md file:border-0 file:bg-[var(--primary)] file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-white`}
        />
      </Campo>

      <Campo id={`descricao-livre-${sufixo}`} rotulo="Observação (opcional)">
        <input
          id={`descricao-livre-${sufixo}`}
          name="descricao"
          placeholder="Ex.: memória de cálculo revisada"
          className={classeInput}
        />
      </Campo>
    </ModalFormulario>
  );
}
