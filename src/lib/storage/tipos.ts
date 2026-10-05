/**
 * Contrato comum dos drivers de armazenamento.
 *
 * A semântica é a do sistema de arquivos: um `caminhoRelativo` identifica um
 * conjunto de bytes. O driver de disco resolve isso numa pasta; o de banco,
 * numa linha de `ArquivoBlob`; o `s3`, numa chave do bucket. Nenhuma rota
 * precisa saber a diferença.
 */
export type ArquivoSalvo = {
  nomeArmazenado: string;
  caminhoRelativo: string;
  tamanhoBytes: number;
  hashSha256: string;
};

/** O que a confirmação do envio precisa saber do que foi gravado. */
export type InfoArquivo = { tamanhoBytes: number };

/** Para onde o navegador manda os bytes, e com que cabeçalhos. */
export type DestinoEnvio = { url: string; cabecalhos: Record<string, string> };

export type OpcoesDownload = {
  /** Nome que o navegador dá ao arquivo salvo — o original, não o uuid. */
  nomeArquivo: string;
  tipoConteudo: string;
  inline: boolean;
};

export type Driver = {
  /** Grava pelo servidor. No fluxo de envio da tela, só o seed e scripts usam. */
  salvarArquivo(arquivo: File, obraId: string): Promise<ArquivoSalvo>;
  /** Stream para a resposta de download, ou `null` se o arquivo não existe. */
  abrirArquivo(caminhoRelativo: string): Promise<ReadableStream<Uint8Array> | null>;
  /** Tamanho do que está gravado, ou `null` se não existe. */
  infoArquivo(caminhoRelativo: string): Promise<InfoArquivo | null>;
  apagarArquivo(caminhoRelativo: string): Promise<void>;

  /**
   * Envio direto do navegador ao armazenamento, sem passar pelo servidor.
   * Só existe em driver de armazenamento externo (`s3`). Sem ele, o navegador
   * envia para a rota `/envios/[id]`, que chama `gravarFluxo`.
   */
  urlDeEnvio?(
    caminhoRelativo: string,
    tamanhoBytes: number,
    tipoConteudo: string,
  ): Promise<DestinoEnvio>;

  /**
   * Grava o corpo recebido pela rota `/envios/[id]`, conferindo que chegaram
   * exatamente `tamanhoEsperado` bytes. Só existe nos drivers locais.
   */
  gravarFluxo?(
    caminhoRelativo: string,
    corpo: ReadableStream<Uint8Array>,
    tamanhoEsperado: number,
  ): Promise<{ tamanhoBytes: number; hashSha256: string }>;

  /**
   * URL temporária para o navegador baixar direto do armazenamento. Sem ela,
   * a rota de download devolve os bytes pelo `abrirArquivo`.
   */
  urlDeDownload?(caminhoRelativo: string, opcoes: OpcoesDownload): Promise<string>;
};
