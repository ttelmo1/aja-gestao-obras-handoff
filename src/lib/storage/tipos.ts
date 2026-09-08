/**
 * Contrato comum dos drivers de armazenamento.
 *
 * A semântica é a do sistema de arquivos: um `caminhoRelativo` identifica um
 * conjunto de bytes. O driver de disco resolve isso numa pasta; o de banco,
 * numa linha de `ArquivoBlob`. Nenhuma rota precisa saber a diferença.
 */
export type ArquivoSalvo = {
  nomeArmazenado: string;
  caminhoRelativo: string;
  tamanhoBytes: number;
  hashSha256: string;
};

export type Driver = {
  salvarArquivo(arquivo: File, obraId: string): Promise<ArquivoSalvo>;
  /** Stream para a resposta de download, ou `null` se o arquivo não existe. */
  abrirArquivo(caminhoRelativo: string): Promise<ReadableStream<Uint8Array> | null>;
  arquivoExiste(caminhoRelativo: string): Promise<boolean>;
  apagarArquivo(caminhoRelativo: string): Promise<void>;
};
