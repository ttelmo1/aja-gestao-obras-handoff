import { posix, resolve, sep } from "node:path";

/**
 * Resolução de caminho dentro do armazenamento.
 *
 * Vive fora de `lib/storage/` porque a fachada é `server-only` e
 * importa `env()` — e esta é a regra de segurança mais importante do módulo
 * documental, justamente a que precisa de teste.
 *
 * A defesa não é procurar `..` no texto. É resolver o caminho e conferir onde
 * ele foi parar: assim cobre `..`, caminho absoluto, barra invertida no
 * Windows e as codificações que a checagem textual deixa passar.
 */
export function resolverDentroDe(raiz: string, caminhoRelativo: string): string {
  const base = resolve(raiz);
  const alvo = resolve(base, caminhoRelativo);
  if (alvo !== base && !alvo.startsWith(base + sep)) {
    throw new Error("Caminho de arquivo fora do armazenamento.");
  }
  return alvo;
}

/**
 * Onde o arquivo de uma obra mora: `obras/<obraId>/<nomeArmazenado>`.
 *
 * Uma pasta por obra mantém o diretório navegável para quem for fazer backup
 * ou precisar dos arquivos sem o sistema — o servidor é do cliente, e um dia
 * alguém abre essa pasta no Finder.
 *
 * **Sempre com barra normal, mesmo no Windows** (`posix.join`, não `join`).
 * Este valor é gravado no banco, em `Documento.caminhoRelativo`, e precisa ser
 * o mesmo texto em qualquer sistema: gravado como `obras\<id>\<uuid>.pdf` no
 * servidor do cliente, um dump restaurado em Linux ou macOS leria isso como um
 * nome de arquivo só, e nenhum documento abriria. O caminho no banco é lógico;
 * quem traduz para o disco é `resolverDentroDe`, e `resolve` aceita os dois
 * sentidos de barra no Windows.
 */
export function caminhoDaObra(obraId: string, nomeArmazenado: string): string {
  return posix.join("obras", obraId, nomeArmazenado);
}
