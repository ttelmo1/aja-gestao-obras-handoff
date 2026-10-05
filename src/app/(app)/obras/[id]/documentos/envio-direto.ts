"use client";

import { useCallback, useState } from "react";

import {
  cancelarEnvio,
  confirmarEnvio,
  prepararEnvio,
  type EstadoDocumento,
} from "./acoes";

/**
 * Envio de documento em três passos, do lado da tela.
 *
 * 1. `prepararEnvio` recebe só nome, tamanho e tipo de cada arquivo, confere
 *    tudo e devolve para onde mandar cada um;
 * 2. a tela manda os bytes direto para lá — bucket em produção, rota
 *    `/envios/[id]` no desenvolvimento —, sem passar pela Server Action, que
 *    na plataforma não aceita mais que ~4,5 MB;
 * 3. `confirmarEnvio` confere o que chegou e cria os documentos.
 *
 * Devolve uma action com a mesma assinatura das outras do formulário, para
 * caber em `useEnvioSemReset` e `ModalFormulario` sem mudar nenhum dos dois, e
 * o progresso em porcentagem enquanto os bytes sobem: com arquivos de 300 MB,
 * um "Enviando…" parado por minutos parece travado.
 */
export function useEnvioDireto() {
  const [progresso, setProgresso] = useState<number | null>(null);

  const acao = useCallback(
    async (_estado: EstadoDocumento, dados: FormData): Promise<EstadoDocumento> => {
      try {
        return await enviar(dados, setProgresso);
      } finally {
        setProgresso(null);
      }
    },
    [],
  );

  return { acao, progresso };
}

/** Texto do botão enquanto envia. */
export function rotuloDoEnvio(progresso: number | null): string {
  return progresso === null ? "Enviando…" : `Enviando… ${progresso}%`;
}

async function enviar(
  dados: FormData,
  aoProgredir: (porcentagem: number) => void,
): Promise<EstadoDocumento> {
  const arquivos = dados
    .getAll("arquivos")
    .filter((a): a is File => a instanceof File && a.size > 0);
  if (arquivos.length === 0) return { erro: "Selecione ao menos um arquivo." };

  const pedido = new FormData();
  for (const [chave, valor] of dados) {
    if (chave !== "arquivos" && typeof valor === "string") pedido.append(chave, valor);
  }
  pedido.set(
    "arquivos",
    JSON.stringify(arquivos.map((a) => ({ nome: a.name, tamanho: a.size, tipo: a.type }))),
  );

  const preparo = await prepararEnvio(pedido);
  if ("erro" in preparo) return { erro: preparo.erro };

  const ids = preparo.envios.map((e) => e.id);
  const total = arquivos.reduce((soma, a) => soma + a.size, 0);
  let jaEnviados = 0;
  aoProgredir(0);

  try {
    // Um de cada vez: em paralelo, cinco arquivos grandes dividiriam a mesma
    // conexão e o primeiro demoraria tanto quanto o último.
    for (const [i, destino] of preparo.envios.entries()) {
      const arquivo = arquivos[i];
      await enviarBytes(destino.url, destino.cabecalhos, arquivo, (enviados) => {
        aoProgredir(Math.floor(((jaEnviados + enviados) / total) * 100));
      });
      jaEnviados += arquivo.size;
    }
  } catch (erro) {
    await cancelarEnvio(ids).catch(() => {});
    return {
      erro:
        erro instanceof Error
          ? erro.message
          : "Não foi possível enviar o arquivo. Tente de novo.",
    };
  }

  aoProgredir(100);
  return confirmarEnvio(String(dados.get("obraId") ?? ""), ids);
}

/**
 * `PUT` com `XMLHttpRequest`, e não `fetch`: só ele informa o progresso do
 * envio. O `fetch` só dá progresso do download.
 */
function enviarBytes(
  url: string,
  cabecalhos: Record<string, string>,
  arquivo: File,
  aoProgredir: (enviados: number) => void,
): Promise<void> {
  return new Promise((resolver, rejeitar) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [nome, valor] of Object.entries(cabecalhos)) {
      xhr.setRequestHeader(nome, valor);
    }
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) aoProgredir(e.loaded);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolver();
      else rejeitar(new Error(`${arquivo.name}: o armazenamento recusou o envio (${xhr.status}).`));
    };
    xhr.onerror = () =>
      rejeitar(
        new Error(`${arquivo.name}: a conexão caiu durante o envio. Tente de novo.`),
      );
    xhr.send(arquivo);
  });
}
